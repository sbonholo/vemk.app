import React, { useState, useEffect, lazy, Suspense } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, ExternalLink, RefreshCw, User as UserIcon } from 'lucide-react';
import { Toast, ToastType } from './components/common/Toast';

// Lazy loading components
const ProfileSetup = lazy(() => import('./components/onboarding/ProfileSetup').then(m => ({ default: m.ProfileSetup })));
const Discovery = lazy(() => import('./components/discovery/Discovery').then(m => ({ default: m.Discovery })));
const Matches = lazy(() => import('./components/matches/Matches').then(m => ({ default: m.Matches })));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const EventCheckIn = lazy(() => import('./components/onboarding/EventCheckIn').then(m => ({ default: m.EventCheckIn })));
const ProfileEdit = lazy(() => import('./components/profile/ProfileEdit').then(m => ({ default: m.ProfileEdit })));

const LoadingFallback = () => (
  <div className="h-full bg-black flex flex-col items-center justify-center gap-4">
    <div className="text-4xl font-black bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent animate-pulse uppercase tracking-tighter italic">
      VEMK
    </div>
    <div className="w-12 h-1 border-2 border-orange-500/20 rounded-full overflow-hidden">
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        className="w-full h-full bg-orange-500"
      />
    </div>
  </div>
);

function Navigation() {
  const { profile, loading, user, authError } = useAuth();
  const [currentTab, setCurrentTab] = useState<'discovery' | 'matches' | 'admin' | 'profile'>('discovery');
  const [matchCount, setMatchCount] = useState(0);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Toast System
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  useEffect(() => {
    if (!user) return;
    
    let unsub: (() => void) | null = null;
    let retryTimeout: NodeJS.Timeout;

    const setupListener = () => {
      const q = query(collection(db, 'matches'), where('userIds', 'array-contains', user.uid));
      unsub = onSnapshot(q, (snapshot) => {
        setMatchCount(snapshot.size);
      }, (error) => {
        console.error("Navigation matches listener failed:", error);
        // If it fails with a retry error, try to rebuild the listener after a delay
        if (error.message.includes('retries')) {
          retryTimeout = setTimeout(setupListener, 5000);
        }
      });
    };

    setupListener();

    return () => {
      if (unsub) unsub();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [user]);

  if (loading) {
    return <LoadingFallback />;
  }

  // Handle Network Error
  if (authError === 'NETWORK_ERROR') {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-600/10 to-transparent pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full glass p-10 rounded-[40px] border border-orange-500/20 space-y-8 text-center relative z-10 shadow-2xl"
        >
          <div className="w-20 h-20 bg-orange-600/20 rounded-3xl flex items-center justify-center mx-auto border border-orange-500/30">
            <RefreshCw size={40} className="text-orange-500 animate-spin-slow" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-black tracking-tighter italic uppercase text-white">Falha na Rede</h2>
            <p className="text-white/40 text-sm font-medium leading-relaxed">
              Não conseguimos conectar aos servidores do Firebase. Verifique sua conexão ou se um <span className="text-white">AdBlocker</span> está impedindo o login.
            </p>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-3 w-full bg-white text-black h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all shadow-xl"
          >
            Tentar Reconectar <RefreshCw size={16} />
          </button>
        </motion.div>
      </div>
    );
  }

  // Handle Firebase Auth Setup Error
  if (authError === 'ANONYMOUS_AUTH_DISABLED') {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full glass p-10 rounded-[40px] border border-red-500/20 space-y-8 text-center relative z-10 shadow-2xl"
        >
          <div className="w-20 h-20 bg-red-600/20 rounded-3xl flex items-center justify-center mx-auto border border-red-500/30">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-black tracking-tighter italic uppercase text-white">Configuração Necessária</h2>
            <p className="text-white/40 text-sm font-medium leading-relaxed">
              O Firebase precisa que o <span className="text-white">Login Anônimo</span> esteja ativado para que as contas anônimas do VemK funcionem.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full bg-white text-black h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all"
            >
              Abrir Console <ExternalLink size={16} />
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-3 w-full glass border border-white/10 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all"
            >
              Já Ativei, Tentar Novamente <RefreshCw size={16} />
            </button>
          </div>

          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 pt-4">
            Authentication &gt; Sign-in method &gt; Anonymous
          </div>
        </motion.div>
      </div>
    );
  }

  // Admin access check (Using hardcoded email or just allowing it for now for demo)
  const isAdmin = true; // In production: user?.email === 'admin@vemk.com'

  // If profile is not complete, show onboarding
  if (!profile && currentTab !== 'admin') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ProfileSetup />
      </Suspense>
    );
  }

  // If checked in status is needed
  if (profile && !profile.currentEventId && currentTab !== 'admin') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <EventCheckIn />
      </Suspense>
    );
  }

  // Main app states
  return (
    <div className="h-full bg-black overflow-hidden flex flex-col relative" style={{ height: '100dvh' }}>
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
      {/* Discreet Admin Access */}
      {isAdmin && currentTab !== 'admin' && (
        <button 
          onClick={() => setCurrentTab('admin')}
          className="absolute top-4 right-4 z-[100] p-2 text-white/10 hover:text-orange-500 transition-colors"
          title="Admin Dashboard"
        >
          <ShieldAlert size={16} />
        </button>
      )}

      <div className="flex-1 relative">
        <Suspense fallback={<LoadingFallback />}>
          <AnimatePresence mode="wait">
            {currentTab === 'discovery' ? (
              <motion.div
                key="discovery"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0"
              >
                <Discovery 
                  showToast={showToast}
                  onGoToMatches={(matchId?: string) => {
                    if (matchId) setSelectedMatchId(matchId);
                    setCurrentTab('matches');
                  }} 
                />
              </motion.div>
            ) : currentTab === 'matches' ? (
              <motion.div
                key="matches"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0"
              >
                <Matches 
                  showToast={showToast}
                  onBack={() => {
                    setSelectedMatchId(null);
                    setCurrentTab('discovery');
                  }} 
                  initialMatchId={selectedMatchId || undefined}
                />
              </motion.div>
            ) : currentTab === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0"
              >
                <ProfileEdit showToast={showToast} onBack={() => setCurrentTab('discovery')} />
              </motion.div>
            ) : (
              <motion.div
                key="admin"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-0 z-[100]"
              >
                <AdminDashboard showToast={showToast} onBack={() => setCurrentTab('discovery')} />
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>
      </div>

      {/* Persistent Bottom Nav - Immersive UI Style */}
      {profile && currentTab !== 'admin' && (
        <div 
          className="glass border-t border-white/10 py-4 px-12 flex justify-between items-center z-50 rounded-t-[32px] shadow-2xl"
          style={{ paddingBottom: 'calc(1rem + var(--sab, 0px))' }}
        >
          {/* 1) Perfil */}
          <button 
            onClick={() => setCurrentTab('profile')}
            className={`p-3 rounded-2xl transition-all ${currentTab === 'profile' ? 'bg-neutral-100 text-black scale-110' : 'text-white/40 hover:text-white/60'}`}
          >
            <UserIcon size={24} />
          </button>

          {/* 2) Stack (Discovery) */}
          <button 
            onClick={() => setCurrentTab('discovery')}
            className={`p-3 rounded-2xl transition-all ${currentTab === 'discovery' ? 'bg-pink-600 text-white glow-pink scale-110' : 'text-white/40 hover:text-white/60'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>

          {/* 3) Chat (Matches) */}
          <button 
            onClick={() => setCurrentTab('matches')}
            className={`p-3 rounded-2xl transition-all relative ${currentTab === 'matches' ? 'bg-blue-600 text-white glow-blue scale-110' : 'text-white/40 hover:text-white/60'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            {matchCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black shadow-lg animate-pulse">
                {matchCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

