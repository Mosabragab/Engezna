import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

// Cache the logo for 1 year (it rarely changes)
const CACHE_MAX_AGE = 31536000;

export const GET = withErrorHandler(async () => {
  // Fetch logo from Supabase storage
  const logoUrl =
    'https://cmxpvzqrmptfnuymhxmr.supabase.co/storage/v1/object/public/Logos/engezna-transparent-white-transparent.png';

  const response = await fetch(logoUrl, {
    next: { revalidate: CACHE_MAX_AGE },
  });

  if (!response.ok) {
    return new NextResponse('Logo not found', { status: 404 });
  }

  const imageBuffer = await response.arrayBuffer();

  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`,
      'Access-Control-Allow-Origin': '*',
    },
  });
});
