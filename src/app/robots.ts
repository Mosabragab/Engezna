/**
 * Robots.txt Configuration
 *
 * Defines crawling rules for search engines.
 * Blocks sensitive routes while allowing main content indexing.
 *
 * @version 1.0.0 - Phase 1.6 Implementation
 * @see docs/MASTER_IMPLEMENTATION_PLAN.md - Section 1.6
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://engezna.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/provider/', '/api/', '/auth/', '/_next/', '/private/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
