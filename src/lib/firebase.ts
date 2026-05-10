import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';

const rawConfig =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_CONFIG) ||
  (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__) ||
  '{}';

const firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
const databaseId: string | undefined = firebaseConfig.firestoreDatabaseId;

export const app = initializeApp(firebaseConfig);
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

let messagingInstance: Messaging | null = null;
export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (messagingInstance) return messagingInstance;
  if (typeof window === 'undefined') return null;
  if (await isSupported()) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
};
