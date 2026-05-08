import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration is loaded from firebase-applet-config.json at runtime
// The VITE_FIREBASE_CONFIG env var is set by the server from firebase-applet-config.json
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

export const getMessagingInstance = async () => {
  if (!messagingInstance) {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
    }
  }
  return messagingInstance;
};
