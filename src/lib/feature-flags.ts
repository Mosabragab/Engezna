/**
 * Feature flags (v2.5.2)
 *
 * Centralised on/off switches for product features that are built but
 * not yet active. Read via `FEATURES.<name>` — never inline the env
 * variable name elsewhere so the flag stays auditable.
 *
 * All flags default to OFF unless the matching env var is the string "true".
 * The string check is deliberate — a numeric 1 or "yes" doesn't activate.
 */

function flag(name: string): boolean {
  // process.env at build time → next.js inlines it. Safe in both server
  // and client bundles as long as the var name starts with NEXT_PUBLIC_.
  return process.env[name] === 'true';
}

export const FEATURES = {
  /**
   * Partner Gifts (provider-funded discount campaigns).
   *
   * Hidden in v2.5.2 per decision matrix #11 — re-enable in a follow-up
   * phase once Beni Suef has 1k+ active customers and 50+ orders/merchant.
   * The backend (RPCs, RLS policies, settlement integration) stays live
   * so historical data + admin-only inspection keep working.
   */
  PARTNER_GIFTS_ENABLED: flag('NEXT_PUBLIC_PARTNER_GIFTS_ENABLED'),
} as const;
