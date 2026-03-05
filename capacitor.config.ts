import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.engezna.app',
  appName: 'إنجزنا',
  webDir: 'out',
  server: {
    // Hybrid App: WebView loads from the deployed Vercel URL
    // For local testing, set CAPACITOR_SERVER_URL=http://YOUR_IP:3000
    url: process.env.CAPACITOR_SERVER_URL || 'https://engezna.com',
    cleartext: true, // Allow HTTP for local development testing
    allowNavigation: ['engezna.com', '*.engezna.com', '192.168.*.*'],
  },
  // Append to user agent so the web app can detect native context
  appendUserAgent: 'CapacitorApp/Engezna',
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
      launchAutoHide: true,
      launchShowDuration: 3000,
      fadeOutDuration: 300,
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
