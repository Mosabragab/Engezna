/**
 * Sentry Server Configuration
 *
 * Phase 4.2: Error Monitoring Integration
 *
 * This file configures Sentry for the Node.js server-side.
 * Implements CI awareness to prevent test failures when
 * Sentry credentials are not available.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

// Environment detection
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const IS_TEST = process.env.NODE_ENV === 'test';
const IS_CI = Boolean(process.env.CI);

// Skip initialization in test environments or CI without DSN (CI awareness)
const shouldInitialize = SENTRY_DSN && !IS_TEST && !(IS_CI && !SENTRY_DSN);

if (shouldInitialize) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment configuration
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

    // Server-side sample rates
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

    // Profiling for performance insights (production only)
    profilesSampleRate: IS_PRODUCTION ? 0.1 : 0,

    // Debug mode only in development
    debug: IS_DEVELOPMENT,

    // Filter sensitive data and reduce noise
    beforeSend(event) {
      // Skip in development unless explicitly enabled
      if (IS_DEVELOPMENT && !process.env.SENTRY_DEBUG) {
        return null;
      }

      // Scrub sensitive headers
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

      // Filter out specific error types
      if (event.exception?.values) {
        const errorMessage = event.exception.values[0]?.value || '';
        const errorType = event.exception.values[0]?.type || '';

        // Ignore expected errors
        const ignoredErrors = [
          'NEXT_NOT_FOUND', // Next.js 404 errors
          'NEXT_REDIRECT', // Next.js redirects
          'AbortError', // Request aborted
          'ECONNRESET', // Connection reset
          'ETIMEDOUT', // Connection timeout
        ];

        if (ignoredErrors.some((err) => errorMessage.includes(err) || errorType.includes(err))) {
          return null;
        }
      }

      return event;
    },

    // Server-specific integrations
    integrations: [
      // HTTP integration for tracing API calls
      Sentry.httpIntegration(),
    ],
  });
} else {
  // Graceful degradation: Log only in development
  if (IS_DEVELOPMENT && !IS_TEST) {
    console.info('[Sentry] Server SDK not initialized:', {
      reason: !SENTRY_DSN ? 'DSN not set' : IS_TEST ? 'Test environment' : 'CI without DSN',
    });
  }
}
