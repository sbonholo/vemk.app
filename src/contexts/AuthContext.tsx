/// <reference types="vite/client" />
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { auth, db, getMessagingInstance } from '../lib/firebase';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  checkout: () => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(fbUser);

      if (!fbUser) {
        setProfile(null);
        setLoading(false);
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error('Anonymous sign-in failed:', err);
        }
        return;
      }

      const userRef = doc(db, 'users', fbUser.uid);
      unsubProfile = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            setProfile({ id: snap.id, ...(snap.data() as Omit<UserProfile, 'id'>) });
          } else {
            setProfile(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error('Profile snapshot error:', err);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) throw new Error('Not authenticated');
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const payload = { ...patch, lastActive: serverTimestamp() };
      if (snap.exists()) {
        await updateDoc(userRef, payload as any);
      } else {
        await setDoc(userRef, payload as any, { merge: true });
      }
    },
    [user]
  );

  const checkout = useCallback(async () => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      currentEventId: null,
      lastActive: serverTimestamp(),
    });
  }, [user]);

  const requestNotificationPermission = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    const messaging = await getMessagingInstance();
    if (!messaging) throw new Error('Notificações não suportadas neste navegador.');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permissão de notificação negada.');

    const vapidKey = (import.meta as any).env?.VITE_VAPID_KEY;
    const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
    if (!token) throw new Error('Falha ao obter token de notificação.');

    await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signOut,
        updateProfile,
        checkout,
        requestNotificationPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
