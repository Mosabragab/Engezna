/**
 * Robots.txt Configuration
 *
 * Defines crawling rules for search engines.
 * Blocks sensitive routes while allowing main content indexing.
 *
 * @version 2.0.0 - SEO Improvements
 */

import { MetadataRoute } from 'next';

// Use www version for consistency
const BASE_URL = 'https://www.engezna.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/provider/',
          '/api/',
          '/auth/',
          '/_next/',
          '/private/',
          '/profile/',
          '/cart',
          '/checkout',
          '/orders/',
          '/dev/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
