/**
 * Sentry Edge Configuration
 *
 * Phase 4.2: Error Monitoring Integration
 *
 * This file configures Sentry for Edge Runtime (middleware, edge API routes).
 * Uses minimal configuration to reduce cold start times.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

// Environment detection
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Only initialize in production with DSN (edge runtime optimization)
if (SENTRY_DSN && IS_PRODUCTION) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment configuration
    environment: process.env.VERCEL_ENV || 'production',

    // Minimal tracing for edge (reduce cold start impact)
    tracesSampleRate: 0.05,

    // No debug in edge runtime
    debug: false,

    // Lightweight error filtering and data scrubbing
    beforeSend(event) {
      // Scrub sensitive headers (prevent auth header leaks from middleware)
      if (event.request?.headers) {
        const sensitiveHeaders = [
          'authorization',
          'cookie',
          'x-api-key',
          'x-auth-token',
          'x-supabase-auth',
        ];
        sensitiveHeaders.forEach((header) => {
          if (event.request?.headers) {
            delete event.request.headers[header];
          }
        });
      }

      // Scrub sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            // Remove potential tokens or passwords
            const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
            Object.keys(breadcrumb.data).forEach((key) => {
              if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
                breadcrumb.data![key] = '[REDACTED]';
              }
            });
          }
          return breadcrumb;
        });
      }

      // Filter out common edge runtime errors
      if (event.exception?.values) {
        const errorMessage = event.exception.values[0]?.value || '';

        // Ignore common non-critical edge errors
        const ignoredErrors = ['NEXT_REDIRECT', 'NEXT_NOT_FOUND', 'AbortError'];

        if (ignoredErrors.some((err) => errorMessage.includes(err))) {
          return null;
        }
      }

      return event;
    },
  });
}
