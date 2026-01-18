/**
 * Sentry Client Configuration
 *
 * Phase 4.2: Error Monitoring Integration
 *
 * This file configures Sentry for the browser/client-side.
 * It initializes only when SENTRY_DSN is available to prevent
 * crashes in CI/CD environments or local development without keys.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

// Environment detection
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Only initialize Sentry if DSN is available (defensive coding)
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment configuration
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',

    // Adjust sample rates based on environment
    // Production: Lower rates to manage costs
    // Development: Higher rates for debugging
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

    // Session replay for debugging user issues
    // Only in production and at low rate to manage costs
    replaysSessionSampleRate: IS_PRODUCTION ? 0.01 : 0,
    replaysOnErrorSampleRate: IS_PRODUCTION ? 0.1 : 0,

    // Debug mode only in development
    debug: IS_DEVELOPMENT,

    // Filter out sensitive data
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (IS_DEVELOPMENT && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
        return null;
      }

      // Scrub sensitive data from the event
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Filter out known non-critical errors
      if (event.exception?.values) {
        const errorMessage = event.exception.values[0]?.value || '';

        // Ignore common non-critical browser errors
        const ignoredErrors = [
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          'Non-Error promise rejection captured',
          'Load failed', // Generic network errors
          'Failed to fetch', // Network errors
          'NetworkError',
          'ChunkLoadError', // Webpack chunk loading (usually network issues)
        ];

        if (ignoredErrors.some((msg) => errorMessage.includes(msg))) {
          return null;
        }
      }

      return event;
    },

    // Integrations
    integrations: [
      // Replay integration for session recording (production only)
      ...(IS_PRODUCTION
        ? [
            Sentry.replayIntegration({
              // Mask all text and inputs for privacy
              maskAllText: true,
              blockAllMedia: true,
            }),
          ]
        : []),
    ],

    // Ignore specific URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
      // Safari extensions
      /^safari-extension:\/\//i,
      // Edge extensions
      /^ms-browser-extension:\/\//i,
    ],

    // Allowed URLs (our domain only)
    allowUrls: [/engezna\.com/i, /localhost/i, /vercel\.app/i],
  });
} else {
  // Log only in development when DSN is missing
  if (IS_DEVELOPMENT) {
    console.info('[Sentry] Client SDK not initialized: NEXT_PUBLIC_SENTRY_DSN is not set');
  }
}
