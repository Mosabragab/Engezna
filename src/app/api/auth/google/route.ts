import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error('Google OAuth credentials not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'postmessage', // Special value for popup flow
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      logger.error('Google token exchange error:', { error: tokens.error });
      return NextResponse.json(
        { error: tokens.error_description || 'Token exchange failed' },
        { status: 400 }
      );
    }

    // Return the ID token to the client
    return NextResponse.json({
      id_token: tokens.id_token,
      access_token: tokens.access_token,
    });
  } catch (error) {
    logger.error('Google auth error:', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
