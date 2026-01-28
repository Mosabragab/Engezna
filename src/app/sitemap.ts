/**
 * Dynamic Sitemap Generation
 *
 * Generates sitemap.xml with static pages and dynamic provider routes.
 * Includes alternates for proper canonical URL handling.
 *
 * @version 2.0.0 - SEO Improvements
 */

import { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase';

// Use www version for canonical consistency
const BASE_URL = 'https://www.engezna.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Initialize Supabase client
  const supabase = await createServerClient();

  // Fetch all active providers
  const { data: providers } = await supabase
    .from('providers')
    .select('id, updated_at')
    .in('status', ['open', 'closed', 'temporarily_paused']);

  // Static pages configuration
  const staticPagesConfig = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/providers', priority: 0.9, changeFrequency: 'hourly' as const },
    { path: '/partner', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/partner/register', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/offers', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/help', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'monthly' as const },
  ];

  // Generate static pages with alternates (fixes canonical issue)
  const staticPages: MetadataRoute.Sitemap = staticPagesConfig.flatMap((page) => [
    {
      url: `${BASE_URL}/ar${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: {
          ar: `${BASE_URL}/ar${page.path}`,
          en: `${BASE_URL}/en${page.path}`,
        },
      },
    },
    {
      url: `${BASE_URL}/en${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority - 0.1, // Slightly lower priority for English (Arabic is primary)
      alternates: {
        languages: {
          ar: `${BASE_URL}/ar${page.path}`,
          en: `${BASE_URL}/en${page.path}`,
        },
      },
    },
  ]);

  // Dynamic provider pages with alternates
  const providerPages: MetadataRoute.Sitemap = (providers || []).flatMap((provider) => [
    {
      url: `${BASE_URL}/ar/providers/${provider.id}`,
      lastModified: new Date(provider.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.7,
      alternates: {
        languages: {
          ar: `${BASE_URL}/ar/providers/${provider.id}`,
          en: `${BASE_URL}/en/providers/${provider.id}`,
        },
      },
    },
    {
      url: `${BASE_URL}/en/providers/${provider.id}`,
      lastModified: new Date(provider.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.6,
      alternates: {
        languages: {
          ar: `${BASE_URL}/ar/providers/${provider.id}`,
          en: `${BASE_URL}/en/providers/${provider.id}`,
        },
      },
    },
  ]);

  return [...staticPages, ...providerPages];
}
