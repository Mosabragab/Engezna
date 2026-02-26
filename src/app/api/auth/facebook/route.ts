import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';

export const POST = withErrorHandler(async (request: Request) => {
  const { accessToken } = await request.json();

  if (!accessToken) {
    return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json({ error: 'Facebook credentials not configured' }, { status: 500 });
  }

  // Verify the access token with Facebook
  const debugResponse = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`
  );

  const debugData = await debugResponse.json();

  if (!debugData.data?.is_valid) {
    return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
  }

  // Get user data from Facebook
  const userResponse = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
  );

  const userData = await userResponse.json();

  if (!userData.id) {
    return NextResponse.json({ error: 'Failed to get user data' }, { status: 400 });
  }

  // Return user data for client-side Supabase authentication
  return NextResponse.json({
    id: userData.id,
    email: userData.email || `${userData.id}@facebook.engezna.com`,
    name: userData.name,
    picture: userData.picture?.data?.url,
  });
});
