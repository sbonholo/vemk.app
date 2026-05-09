import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useLocationWatcher } from './hooks/useLocationWatcher';
import { db } from './lib/firebase';
import ProfileSetup from './components/onboarding/ProfileSetup';
import { Discovery } from './components/discovery/Discovery';
import type { EventDoc } from './types';

function LoadingScreen({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center w-full bg-[var(--color-brand-bg)]"
      style={{ height: '100dvh' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
        <p className="text-xs font-black uppercase tracking-[0.4em] text-white/40">{label}</p>
      </div>
    </div>
  );
}

function SignInScreen() {
  const { signInWithGoogle } = useAuth();
  return (
    <div
      className="flex flex-col items-center justify-center w-full px-6 bg-[var(--color-brand-bg)]"
      style={{ height: '100dvh' }}
    >
      <h1 className="text-6xl font-black italic uppercase tracking-tighter text-white">VemK</h1>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-500 mt-2 mb-12">
        Match no rolê
      </p>
      <button
        onClick={() => signInWithGoogle().catch(console.error)}
        className="px-8 py-4 bg-pink-600 glow-pink rounded-3xl text-white text-xs font-black uppercase tracking-[0.3em]"
      >
        Entrar com Google
      </button>
    </div>
  );
}

function AppShell() {
  const { user, profile, loading } = useAuth();

  // Keep a global location watcher running as soon as we have a uid (anonymous or signed in)
  useLocationWatcher(user?.uid);

  const [event, setEvent] = useState<EventDoc | null>(null);

  useEffect(() => {
    if (!profile?.currentEventId) {
      setEvent(null);
      return;
    }
    const ref = doc(db, 'events', profile.currentEventId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setEvent({ id: snap.id, ...(snap.data() as Omit<EventDoc, 'id'>) });
        } else {
          setEvent(null);
        }
      },
      (err) => console.error('Event snapshot error:', err)
    );
    return () => unsub();
  }, [profile?.currentEventId]);

  if (loading) return <LoadingScreen />;
  if (!user) return <SignInScreen />;

  const profileComplete = !!(profile?.nickname && profile?.gender && profile.seeking?.length && profile?.photoUrl);
  if (!profileComplete) {
    return <ProfileSetup onComplete={() => { /* auth context snapshot will refresh */ }} />;
  }

  return <Discovery eventName={event?.name} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
