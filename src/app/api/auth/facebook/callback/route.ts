import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Parse state to get locale and redirect
  let locale = 'ar';
  let redirectTo = '/';

  if (state) {
    try {
      const stateData = JSON.parse(decodeURIComponent(state));
      locale = stateData.locale || 'ar';
      redirectTo = stateData.redirect || '/';
    } catch {
      // Use defaults
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';

  if (error) {
    logger.error('Facebook OAuth error:', { error });
    return NextResponse.redirect(`${baseUrl}/${locale}/auth/login?error=facebook_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/${locale}/auth/login?error=no_code`);
  }

  try {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      logger.error('Facebook credentials not configured');
      return NextResponse.redirect(`${baseUrl}/${locale}/auth/login?error=config`);
    }

    // Determine redirect URI based on request origin
    const origin = request.headers.get('origin') || baseUrl;
    const redirectUri = `${origin}/api/auth/facebook/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&client_secret=${appSecret}` +
        `&code=${code}`,
      { method: 'GET' }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      logger.error('Facebook token error:', { error: tokenData.error });
      return NextResponse.redirect(`${baseUrl}/${locale}/auth/login?error=token_failed`);
    }

    const accessToken = tokenData.access_token;

    // Get user info from Facebook
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    const userData = await userResponse.json();

    if (!userData.id) {
      logger.error('Failed to get Facebook user data');
      return NextResponse.redirect(`${baseUrl}/${locale}/auth/login?error=user_data_failed`);
    }

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Check if user exists with this email
    const email = userData.email || `${userData.id}@facebook.engezna.com`;

    // Try to sign in with OAuth (this will create user if not exists)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        skipBrowserRedirect: true,
      },
    });

    // Since we can't use signInWithOAuth directly with a token,
    // we'll use a different approach - create/sign in user with email
    // First check if user exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, phone, governorate')
      .eq('email', email)
      .single();

    if (existingProfile) {
      // User exists - sign them in using magic link workaround
      // Actually, we need to handle this differently
      // Let's redirect to a client-side handler that will complete the auth
      const response = NextResponse.redirect(
        `${baseUrl}/${locale}/auth/facebook-complete?` +
          `access_token=${accessToken}` +
          `&user_id=${userData.id}` +
          `&email=${encodeURIComponent(email)}` +
          `&name=${encodeURIComponent(userData.name || '')}` +
          `&picture=${encodeURIComponent(userData.picture?.data?.url || '')}`
      );
      return response;
    } else {
      // New user - redirect to complete auth and then profile
      const response = NextResponse.redirect(
        `${baseUrl}/${locale}/auth/facebook-complete?` +
          `access_token=${accessToken}` +
          `&user_id=${userData.id}` +
          `&email=${encodeURIComponent(email)}` +
          `&name=${encodeURIComponent(userData.name || '')}` +
          `&picture=${encodeURIComponent(userData.picture?.data?.url || '')}` +
          `&new_user=true`
      );
      return response;
    }
  } catch (error) {
    logger.error('Facebook callback error:', { error });
    return NextResponse.redirect(`${baseUrl}/${locale}/auth/login?error=callback_failed`);
  }
}
