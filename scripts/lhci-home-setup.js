'use strict';

/**
 * Lighthouse CI Puppeteer setup script.
 *
 * Why this exists:
 *   `/ar` (the customer home page) is gated by TWO guards before it
 *   actually renders:
 *     1. src/middleware.ts:70 — checks the `engezna_has_location` cookie
 *        and redirects to `/ar/welcome` server-side if missing.
 *     2. src/app/[locale]/HomePageClient.tsx:163-178 — reads
 *        `engezna_guest_location` from localStorage on first render
 *        (via a useState lazy initializer) and calls
 *        `router.replace('/ar/welcome')` post-hydration if the parsed
 *        value has no `governorateId`.
 *
 *   The `extraHeaders` cookie injection in lighthouserc.js handles
 *   guard #1, but Lighthouse CI has no way to seed localStorage from
 *   HTTP headers. So this script writes the seed into localStorage
 *   before each audit.
 *
 * IMPORTANT — empty-home pitfall (Codex catch from PR #384 first run):
 *   HomePageClient.tsx:326-330 uses the seeded `cityId` and
 *   `governorateId` as STRICT Supabase filters when querying for
 *   nearby + top-rated providers. If the seeded IDs don't match any
 *   real row in the `governorates`/`cities` tables, the page renders
 *   the home chrome but with empty provider lists — that's not the
 *   real user journey and produces misleading lab metrics.
 *
 *   The first CI run with this script used synthetic strings
 *   ('lhci-test-governorate', 'lhci-test-city'); the result was
 *   /ar perf = 0.43–0.50 with CLS errors, all driven by the
 *   empty-providers-then-skeleton-collapse render path.
 *
 *   To audit the real home, configure GitHub Actions secrets:
 *     LHCI_SEED_GOVERNORATE_ID  — UUID of a populated governorate
 *     LHCI_SEED_CITY_ID         — UUID of a populated city (optional;
 *                                 if omitted the home renders all
 *                                 providers in the governorate)
 *
 *   Without those secrets, `/ar` is intentionally OMITTED from the
 *   lighthouserc.js URL list — the puppeteer setup is wired up and
 *   ready, but the audit only runs when the seed values match real
 *   DB rows. This is documented in PERFORMANCE_OPTIMIZATION_ROADMAP
 *   §0.5 / §0.6 as the B-bis gate condition.
 */

const GUEST_LOCATION_KEY = 'engezna_guest_location';

const SEED_GOVERNORATE_ID = process.env.LHCI_SEED_GOVERNORATE_ID || null;
const SEED_CITY_ID = process.env.LHCI_SEED_CITY_ID || null;

const SEED_LOCATION = {
  governorateId: SEED_GOVERNORATE_ID,
  governorateName: { ar: 'بني سويف', en: 'Beni Suef' },
  cityId: SEED_CITY_ID,
  cityName: SEED_CITY_ID ? { ar: 'بني سويف', en: 'Beni Suef' } : null,
};

module.exports = async (browser, context) => {
  // If no governorate seed is configured this script becomes a no-op.
  // lighthouserc.js separately excludes `/ar` from the URL list when
  // LHCI_SEED_GOVERNORATE_ID is unset, so the audit never starts.
  // We still keep the function exported (as a guard against the env
  // being set inconsistently) but log a clear warning rather than
  // writing test placeholders that would silently mismeasure home.
  if (!SEED_GOVERNORATE_ID) {
    // eslint-disable-next-line no-console
    console.warn(
      '[lhci-home-setup] LHCI_SEED_GOVERNORATE_ID not set — skipping localStorage seed. /ar audit (if scheduled) will redirect to /ar/welcome.'
    );
    return;
  }

  const targetOrigin = new URL(context.url).origin;
  const page = await browser.newPage();
  try {
    // `/ar/welcome` is the cheapest reliably-rendering page in the app
    // for a state-seeding visit (no auth, no provider data, no images
    // we care about).
    await page.goto(`${targetOrigin}/ar/welcome`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.evaluate(
      (key, value) => {
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // Storage may be unavailable in some sandbox configurations;
          // Lighthouse will still measure something, just not the home.
        }
      },
      GUEST_LOCATION_KEY,
      SEED_LOCATION
    );
  } finally {
    await page.close();
  }
};
