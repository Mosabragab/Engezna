import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

/**
 * App Version Check API
 *
 * Returns the minimum required app version and latest available version.
 * Used by the native app (Capacitor) to show force/optional update prompts.
 *
 * Response:
 * - latestVersion: the newest version available in stores
 * - minimumVersion: the minimum version required (older versions are force-updated)
 * - updateUrl.android: Google Play Store URL
 * - updateUrl.ios: Apple App Store URL
 */
export const GET = withErrorHandler(async () => {
  return NextResponse.json({
    latestVersion: '1.0.0',
    minimumVersion: '1.0.0',
    updateUrl: {
      android: 'https://play.google.com/store/apps/details?id=com.engezna.app',
      ios: 'https://apps.apple.com/app/engezna/id0000000000',
    },
  });
});
