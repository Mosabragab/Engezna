import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Middleware runs at edge and bundles its dependencies automatically
  // Do not use serverExternalPackages for packages used in middleware
};

export default withNextIntl(nextConfig);
