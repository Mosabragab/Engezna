// Firebase configuration - all values from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Check if Firebase is properly configured (required env vars are set)
function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.appId);
}

// Firebase app instance (lazy loaded)
let firebaseApp: import('firebase/app').FirebaseApp | null = null;

// Get Firebase app (lazy loads Firebase SDK)
export async function getFirebaseApp(): Promise<import('firebase/app').FirebaseApp | null> {
  if (!isFirebaseConfigured()) {
    console.warn(
      'Firebase not configured: missing required environment variables (NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_APP_ID)'
    );
    return null;
  }

  if (!firebaseApp) {
    const { initializeApp, getApps } = await import('firebase/app');
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return firebaseApp;
}

// Get Firebase Messaging instance (lazy loads Firebase Messaging SDK)
let messagingInstance: import('firebase/messaging').Messaging | null = null;

export async function getFirebaseMessaging(): Promise<
  import('firebase/messaging').Messaging | null
> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isFirebaseConfigured()) {
    return null;
  }

  // Dynamic import Firebase Messaging
  const { getMessaging, isSupported } = await import('firebase/messaging');

  // Check if messaging is supported
  const supported = await isSupported();
  if (!supported) {
    console.warn('Firebase Messaging is not supported in this browser');
    return null;
  }

  if (!messagingInstance) {
    const app = await getFirebaseApp();
    if (!app) return null;
    messagingInstance = getMessaging(app);
  }

  return messagingInstance;
}

export { firebaseConfig };
