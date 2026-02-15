import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';
import { withSentryConfig } from '@sentry/nextjs';
import { generateFirebaseMessagingSW } from './src/lib/firebase/generate-sw';

// Generate firebase-messaging-sw.js from env vars at build time
generateFirebaseMessagingSW();

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Suppress Serwist + Turbopack warning (Serwist works in production builds)
process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING = '1';

// Serwist configuration for PWA
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development', // Disable in dev for easier debugging
});

const nextConfig: NextConfig = {
  // Middleware runs at edge and bundles its dependencies automatically
  // Do not use serverExternalPackages for packages used in middleware

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'cmxpvzqrmptfnuymhxmr.supabase.co',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security Headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(self), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://checkout.kashier.io https://*.firebaseio.com https://www.googletagmanager.com https://js.sentry-cdn.com https://vercel.live https://*.vercel.app",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://*.googleusercontent.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://api.kashier.io https://checkout.kashier.io https://*.firebaseio.com https://fcm.googleapis.com https://*.here.com https://*.sentry.io https://vercel.live https://*.ingest.sentry.io",
              "frame-src 'self' https://accounts.google.com https://checkout.kashier.io https://*.firebaseapp.com",
              "worker-src 'self' blob:",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

// Sentry configuration options for bundle optimization
const sentryWebpackPluginOptions = {
  // Organization and project for source maps (optional, can be set via env)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in production
  silent: process.env.NODE_ENV !== 'production',

  // Upload source maps for better stack traces
  widenClientFileUpload: true,

  // Hide source maps from the client bundle (security)
  hideSourceMaps: true,

  // Disable automatic instrumentation for smaller bundle
  disableLogger: true,

  // Tree shake unused Sentry features for smaller bundle
  tunnelRoute: '/monitoring',

  // Automatically instrument React components (can increase bundle)
  reactComponentAnnotation: {
    enabled: false, // Disabled to reduce bundle size
  },

  // Automatic transaction/span creation
  automaticVercelMonitors: true,
};

// Build the config pipeline: Serwist -> NextIntl
const configWithPlugins = withSerwist(withNextIntl(nextConfig));

// Apply Sentry only if DSN is configured (CI awareness)
// This prevents build failures when Sentry credentials are not available
const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(configWithPlugins, sentryWebpackPluginOptions)
  : configWithPlugins;

export default finalConfig;
