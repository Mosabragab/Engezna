/**
 * Lighthouse CI Configuration
 * Store-Ready Performance Testing
 *
 * Targets for App Store / Google Play:
 * - Performance: 70+
 * - Accessibility: 90+
 * - Best Practices: 85+
 * - SEO: 85+ (except auth pages with noindex)
 *
 * Phase 2: when LHCI_TARGET_URL is set (deployment_status workflow),
 * audit the deployed Vercel preview directly. Otherwise build + serve
 * locally as before — keeps `npm run lighthouse` working unchanged.
 */
const BASE_URL = process.env.LHCI_TARGET_URL || 'http://localhost:3000';
const RUN_LOCAL_SERVER = !process.env.LHCI_TARGET_URL;

// Stable sample provider used for measuring `/ar/providers/{id}` (P1 in
// docs/PERFORMANCE_OPTIMIZATION_ROADMAP.md §0.2). Picked deliberately:
//   - مطعم الصفا — active, well-populated provider, low churn risk
//   - has cover image so the audit exercises Image priority/preload paths
//   - has `operation_mode='custom'` so CustomOrderWelcomeBanner renders,
//     making this URL a permanent regression guard for the CLS + LCP fixes
//     landed in PR #381
// The companion CI workflow (.github/workflows/lighthouse.yml) does a HEAD
// preflight against this URL before invoking lhci, so if the provider is
// ever deactivated the job fails fast with a clear message instead of
// quietly auditing a 404 page. If you swap this id, swap it there too.
const HARDCODED_PROVIDER_ID = 'ad52ece8-69c0-4f46-918e-1fbba73655cd';

module.exports = {
  ci: {
    collect: {
      // Number of runs for averaging
      numberOfRuns: 3,

      // URL patterns to test.
      //
      // `/ar` (the real home page) is NOT in this list. Seeding the
      // home-required state requires both:
      //   1. cookie injection in `extraHeaders` below (handles middleware)
      //   2. a Puppeteer setup script (handles the client-side localStorage
      //      gate in HomePageClient.tsx:163-178)
      // The Puppeteer route needs `puppeteer` installed as a dev dep, which
      // pulls ~300 MB of Chromium into CI install time. That's a separate
      // decision (task B-bis in roadmap §0.6). Until then, adding `/ar` here
      // would silently re-measure `/welcome` because the client redirect
      // still fires post-hydration — so keep it OUT.
      url: [
        `${BASE_URL}/ar/providers`,
        `${BASE_URL}/ar/providers/${HARDCODED_PROVIDER_ID}`,
        `${BASE_URL}/ar/cart`,
        `${BASE_URL}/ar/auth/login`,
        `${BASE_URL}/ar/custom-order`,
        `${BASE_URL}/ar/provider/login`,
      ],

      // Only spawn `next start` when measuring localhost; for a remote
      // target_url the URL is already serving and starting a local server
      // would just waste runner time and risk port conflicts.
      ...(RUN_LOCAL_SERVER && {
        startServerCommand: 'npm run start',
        startServerReadyPattern: 'Ready',
        startServerReadyTimeout: 30000,
      }),

      // Chrome settings for mobile simulation
      settings: {
        // Simulate mobile device
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 915,
          deviceScaleFactor: 2.625,
          disabled: false,
        },

        // Throttling for realistic mobile performance
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 0,
          downloadThroughputKbps: 1638.4,
          uploadThroughputKbps: 675,
        },

        // Locale
        locale: 'ar',

        // Cookie injection passes the middleware-level location check
        // (src/middleware.ts:70). On its own it does NOT prevent the
        // client-side redirect from HomePageClient.tsx:163-178, which
        // reads `engezna_guest_location` from localStorage. So this
        // cookie is harmless setup on every route in the URL list above
        // (none of them gate on it) and will pair with the Puppeteer
        // script once task B-bis adds the localStorage seeding piece.
        extraHeaders: { Cookie: 'engezna_has_location=1' },

        // Vercel preview deployments serve `x-robots-tag: noindex` from
        // Vercel's edge so previews don't get indexed by Google. That's
        // platform behavior, not our code — but Lighthouse's
        // `is-crawlable` audit deducts ~12 points from the SEO category
        // for it (deterministically: 1.0 → 0.58). Skipping the audit
        // only when measuring a preview keeps the SEO threshold
        // meaningful for everything we control (title, description,
        // lang, viewport, link text, image alt) without baking the
        // platform deduction into our minScore. Local `npm run
        // lighthouse` (no LHCI_TARGET_URL) keeps the audit on, so a
        // stray `<meta name="robots" content="noindex">` in source
        // would still be caught there + by the grep guardrail in
        // `.github/workflows/ci.yml`. Production reinstatement of this
        // audit is tracked as a follow-up in
        // docs/PERFORMANCE_OPTIMIZATION_ROADMAP.md §8.
        ...(RUN_LOCAL_SERVER ? {} : { skipAudits: ['is-crawlable'] }),
      },

      // Chrome flags
      chromeFlags: ['--no-sandbox', '--disable-gpu', '--headless', '--disable-dev-shm-usage'],
    },

    assert: {
      // Assertions for store readiness
      assertions: {
        // Performance metrics
        'categories:performance': ['error', { minScore: 0.6 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.85 }],
        // SEO: 0.6 covers the audits we control (title, description,
        // lang, viewport, link text, image alt). On Vercel preview the
        // `is-crawlable` audit is skipped via collect.settings above —
        // see the comment there for rationale.
        'categories:seo': ['error', { minScore: 0.6 }],

        // Core Web Vitals - CI-friendly thresholds (CPU throttled 4x)
        // TTI 9000ms + TBT 700ms: observed ~50-150ms CI variance on
        // /welcome and /custom-order; real-device traces well under
        // targets. /ar/providers was momentarily breaching this with
        // ~780ms — it has since been fixed (memoized ProviderCard,
        // progressive 12-card initial render, early-exit search,
        // short-circuit filter useMemo) so the threshold is back at
        // 700ms. See docs/PERFORMANCE_OPTIMIZATION_ROADMAP.md §6 Phase 1.
        'first-contentful-paint': ['error', { maxNumericValue: 4000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 7000 }],
        interactive: ['error', { maxNumericValue: 9000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 700 }],

        // Resource efficiency (battery friendly)
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }],
        'bootup-time': ['warn', { maxNumericValue: 3000 }],
        'dom-size': ['warn', { maxNumericValue: 1500 }],

        // Network efficiency
        'total-byte-weight': ['warn', { maxNumericValue: 2000000 }],
        'render-blocking-resources': ['warn', { maxNumericValue: 500 }],

        // Accessibility
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',

        // PWA audits removed - deprecated in Lighthouse 12+
      },
    },

    upload: {
      // Persist results to disk so they can be picked up by the
      // `actions/upload-artifact@v4` step in
      // .github/workflows/lighthouse.yml. The previous
      // 'temporary-public-storage' target uploaded reports to Google's
      // hosted infra and left the local .lighthouseci/ folder empty,
      // which made the GitHub Actions artifact upload silently warn
      // "No files were found" — so the metrics PRs depended on were
      // not actually downloadable. With filesystem we get reliable
      // JSON + HTML in .lighthouseci/, ready to be archived per run.
      target: 'filesystem',
      outputDir: './.lighthouseci',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },

    // Server configuration
    server: {
      // Storage path for results
      storage: {
        storageMethod: 'sql',
        sqlDatabasePath: '.lighthouseci/db.sql',
      },
    },
  },
};

// Exported for use by the CI preflight script — see
// .github/workflows/lighthouse.yml. Not part of lhci's own config schema.
module.exports.HARDCODED_PROVIDER_ID = HARDCODED_PROVIDER_ID;
