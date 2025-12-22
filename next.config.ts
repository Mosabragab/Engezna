import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Serwist configuration for PWA
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // Disable in dev for easier debugging
});

const nextConfig: NextConfig = {
  // Middleware runs at edge and bundles its dependencies automatically
  // Do not use serverExternalPackages for packages used in middleware
};

// Apply both plugins: Serwist wraps NextIntl
export default withSerwist(withNextIntl(nextConfig));
