/**
 * Dynamic Sitemap Generation
 *
 * Generates sitemap.xml with static pages and dynamic provider routes.
 * Fetches active providers from Supabase for comprehensive indexing.
 *
 * @version 1.0.0 - Phase 1.6 Implementation
 * @see docs/MASTER_IMPLEMENTATION_PLAN.md - Section 1.6
 */

import { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://engezna.com';

  // Initialize Supabase client
  const supabase = await createServerClient();

  // Fetch all active providers
  const { data: providers } = await supabase
    .from('providers')
    .select('id, updated_at')
    .in('status', ['open', 'closed', 'temporarily_paused']);

  // Static pages with high priority
  const staticPages: MetadataRoute.Sitemap = [
    // Homepage (AR/EN)
    {
      url: `${baseUrl}/ar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // Providers listing
    {
      url: `${baseUrl}/ar/providers`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/providers`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    // Offers
    {
      url: `${baseUrl}/ar/offers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/en/offers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    // Legal pages
    {
      url: `${baseUrl}/ar/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/en/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/ar/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/en/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Dynamic provider pages (AR/EN for each provider)
  const providerPages: MetadataRoute.Sitemap = (providers || []).flatMap((provider) => [
    {
      url: `${baseUrl}/ar/providers/${provider.id}`,
      lastModified: new Date(provider.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/en/providers/${provider.id}`,
      lastModified: new Date(provider.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
  ]);

  return [...staticPages, ...providerPages];
}
