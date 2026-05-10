import { auth } from './firebase';

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
  } | null;
  timestamp: any;
}

export const handleFirestoreError = (error: unknown): FirestoreErrorInfo | null => {
  if (error instanceof Error) {
    const fbError = error as any;
    const code = fbError.code;
    if (code === 'permission-denied') {
      return { error: 'Permission denied. Please check your Firestore security rules.', operationType: 'get', path: null, authInfo: null, timestamp: null };
    }
    if (code === 'unauthenticated' || code === 'unauthorized') {
      const user = auth.currentUser;
      return {
        error: 'Authentication required. Please sign in.',
        operationType: 'get',
        path: null,
        authInfo: user ? { userId: user.uid, email: user.email || '', emailVerified: user.emailVerified || false, isAnonymous: user.isAnonymous || false } : null,
        timestamp: null
      };
    }
    return { error: fbError.message || 'Unknown error', operationType: 'get', path: null, authInfo: null, timestamp: null };
  }
  return null;
};
