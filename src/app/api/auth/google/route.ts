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

    // Handle non-OK responses from Google
    if (!tokenResponse.ok) {
      let errorBody: Record<string, unknown> = {};
      try {
        errorBody = await tokenResponse.json();
      } catch {
        const text = await tokenResponse.text();
        errorBody = { raw: text };
      }

      const errorCode = typeof errorBody.error === 'string' ? errorBody.error : 'unknown';
      const errorDesc =
        typeof errorBody.error_description === 'string' ? errorBody.error_description : undefined;

      logger.error('[Google Auth] Token exchange failed', undefined, {
        googleError: errorCode,
        googleErrorDescription: errorDesc || 'none',
        httpStatus: tokenResponse.status,
      });

      return NextResponse.json(
        {
          error: errorDesc || errorCode || 'Token exchange failed',
          error_code: errorCode,
        },
        { status: 400 }
      );
    }

    const tokens = await tokenResponse.json();

    // Validate that we received the required tokens
    if (!tokens.id_token) {
      logger.error('[Google Auth] No id_token in response', undefined, {
        hasAccessToken: !!tokens.access_token,
        tokenKeys: Object.keys(tokens).join(','),
      });
      return NextResponse.json({ error: 'Invalid token response from Google' }, { status: 400 });
    }

    // Return the ID token to the client
    return NextResponse.json({
      id_token: tokens.id_token,
      access_token: tokens.access_token,
    });
  } catch (error) {
    logger.error('[Google Auth] Unexpected error', error instanceof Error ? error : undefined, {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
