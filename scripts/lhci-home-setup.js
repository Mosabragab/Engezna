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
 *   HTTP headers. Without this script, `/ar` would let Lighthouse start
 *   measuring the home page, then immediately redirect to welcome after
 *   hydration — giving misleading/blended numbers worse than the
 *   pre-existing "always measure welcome" baseline.
 *
 * What it does:
 *   For each URL Lighthouse audits, we open a same-origin page first,
 *   write a synthetic GuestLocation into localStorage (any truthy
 *   `governorateId` is enough to pass the redirect check), then close
 *   the helper page. localStorage is origin-scoped, so when Lighthouse
 *   opens its own page on the same origin moments later, the seeded
 *   entry is available before HomePageClient's first read.
 *
 * Footprint:
 *   The seeding is harmless on every other route (none of them gate
 *   on `engezna_guest_location` in a way that changes behaviour), so
 *   we run it unconditionally for simplicity. Per-run overhead is
 *   one extra navigation (~1s on CI), acceptable for a 6-URL run.
 *
 * Shape of the seeded value matches src/lib/hooks/useGuestLocation.ts
 * `GuestLocation` interface. The names are intentionally tagged with
 * "lhci-" so any UI accidentally surfacing them is obviously test data.
 */

const GUEST_LOCATION_KEY = 'engezna_guest_location';

const SEED_LOCATION = {
  governorateId: 'lhci-test-governorate',
  governorateName: { ar: 'بني سويف', en: 'Beni Suef' },
  cityId: 'lhci-test-city',
  cityName: { ar: 'بني سويف', en: 'Beni Suef' },
};

module.exports = async (browser, context) => {
  // `context.url` is the URL Lighthouse is about to audit. We need a
  // same-origin page first so localStorage is reachable for that origin.
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
