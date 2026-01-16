import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAMUPCzi2GacDUFIwFLZA11vpFI-bhAAmg',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'engezna-6edd0.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'engezna-6edd0',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'engezna-6edd0.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '937850460252',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:937850460252:web:a736c7a313307da7eaae99',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-1YF8CT5QB6',
};

// Initialize Firebase (singleton pattern)
let firebaseApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return firebaseApp;
}

// Get Firebase Messaging instance (only in browser)
let messagingInstance: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  // Check if messaging is supported
  const supported = await isSupported();
  if (!supported) {
    console.warn('Firebase Messaging is not supported in this browser');
    return null;
  }

  if (!messagingInstance) {
    const app = getFirebaseApp();
    messagingInstance = getMessaging(app);
  }

  return messagingInstance;
}

export { firebaseConfig };
