/// <reference types="vite/client" />
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getMessagingInstance } from '../lib/firebase';

const AUTH_TIMEOUT_MS = 10000;

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const authTimeoutRef = useMemo<ReturnType<typeof setTimeout> | null>(null);
oken: token });
          console.log('FCM Token registered');
          return;
        } else {
          throw new Error('Falha ao obter token de notificação.');
        }
      } else {
        throw new Error('Permissão de notificação negada.');
      }
    } catch (error: any) {
      console.error('FCM error:', error);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async (): Promise<void> => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
bProfile) unsubProfile();
      if (unsubMessaging) unsubMessaging();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Separate effect for anonymous sign in to avoid collision with auth observer
  useEffect(() => {
    const triggerSignIn = async () => {
      // Wait for the auth state to settle (max 10s)
      const start = Date.now();
      while (loading && Date.now() - start < AUTH_TIMEOUT_MS) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await signInAnonymously(auth);
    };
    triggerSignIn().catch((error) => console.error('Anon sign-in failed:', error));
  }, [loading]);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
