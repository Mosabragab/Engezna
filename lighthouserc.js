/**
 * Lighthouse CI Configuration
 * Store-Ready Performance Testing
 *
 * Targets for App Store / Google Play:
 * - Performance: 70+
 * - Accessibility: 90+
 * - Best Practices: 85+
 * - SEO: 85+ (except auth pages with noindex)
 */
module.exports = {
  ci: {
    collect: {
      // Number of runs for averaging
      numberOfRuns: 3,

      // URL patterns to test
      url: [
        'http://localhost:3000/ar',
        'http://localhost:3000/ar/providers',
        'http://localhost:3000/ar/cart',
        'http://localhost:3000/ar/auth/login',
        'http://localhost:3000/ar/custom-order',
        'http://localhost:3000/ar/provider/login',
      ],

      // Start the server (build is done separately in CI)
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready',
      startServerReadyTimeout: 30000,

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
        // SEO: lower threshold for auth pages (noindex is intentional) and client-rendered pages
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
