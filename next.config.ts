import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Fix for Vercel middleware build issue
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  // Ensure middleware works correctly on Vercel
  outputFileTracingIncludes: {
    '/': ['./node_modules/next-intl/**/*'],
  },
};

export default withNextIntl(nextConfig);
