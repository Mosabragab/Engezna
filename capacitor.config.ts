import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.engezna.app',
  appName: 'إنجزنا',
  webDir: 'out',
  server: {
    // Hybrid App: WebView loads from the deployed Vercel URL
    // This allows full Next.js SSR/ISR/API routes to work
    url: process.env.CAPACITOR_SERVER_URL || 'https://engezna.com',
    cleartext: false, // HTTPS only
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0F172A',
  },
  ios: {
    scheme: 'Engezna',
    backgroundColor: '#0F172A',
    contentInset: 'automatic',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0F172A',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
