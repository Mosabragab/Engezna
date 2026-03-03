import type { ImageLoaderProps } from 'next/image';

/**
 * Supabase Storage Image Loader for Next.js
 *
 * Uses Supabase's built-in image transformation API to serve optimized images
 * directly from the CDN edge, reducing bandwidth and improving LCP.
 *
 * Transforms: /storage/v1/object/public/... → /storage/v1/render/image/public/...
 * with width, quality, and resize parameters.
 *
 * For non-Supabase URLs, returns the src unchanged (falls back to default behavior).
 */
export function supabaseImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Only transform Supabase Storage public URLs
  if (src.includes('supabase.co/storage/v1/object/public/')) {
    const transformUrl = src.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    const q = quality || 75;
    return `${transformUrl}?width=${width}&quality=${q}&resize=contain`;
  }

  // Non-Supabase URLs: return as-is (Next.js default optimization applies)
  return `${src}?w=${width}&q=${quality || 75}`;
}
