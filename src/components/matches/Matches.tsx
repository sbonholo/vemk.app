import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Match, UserProfile } from '../../types';
import { MessageCircle, ArrowLeft, Heart, Flame, Trash2, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LikeType } from '../../types';
import { ToastType } from '../common/Toast';

// Lazy load Chat
const Chat = lazy(() => import('./Chat').then(m => ({ default: m.Chat })));

const ChatLoading = () => (
  <div className="flex flex-col h-full bg-black items-center justify-center gap-4">
    <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_#ec4899]" />
    <p className="text-[10px] font-black uppercase tracking-widest text-pink-500 animate-pulse">Iniciando Chat...</p>
  </div>
);

const LIKE_EMOJIS: Record<LikeType, string> = {
  light: '❤️',
  normal: '💋',
  hot: '🔥'
};

export function Matches({ onBack, initialMatchId, showToast }: { onBack: () => void, initialMatchId?: string, showToast: (msg: string, type?: ToastType) => void }) {
  const { user, profile } = useAuth();
  const [matches, setMatches] = useState<(Match & { otherUser: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<(Match & { otherUser: UserProfile }) | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  const profilesCache = useRef<Record<string, UserProfile>>({});

  const [hasProcessedInitial, setHasProcessedInitial] = useState(false);

  useEffect(() => {
    if (!loading && initialMatchId && matches.length > 0 && !hasProcessedInitial) {
      const match = matches.find(m => m.id === initialMatchId);
      if (match) {
        setSelectedMatch(match);
        setHasProcessedInitial(true);
      }
    }
  }, [initialMatchId, matches, loading, hasProcessedInitial]);

  useEffect(() => {
    if (!user) return;

    let unsub: (() => void) | null = null;
    let unsubBlocks: (() => void) | null = null;
    let retryTimeout: NodeJS.Timeout;

    const setupListeners = () => {
      // Listen for blocks
      const blocksQ = query(collection(db, 'blocks'), where('blockerId', '==', user.uid));
      unsubBlocks = onSnapshot(blocksQ, (snapshot) => {
        setBlockedUserIds(new Set(snapshot.docs.map(d => d.data().blockedId)));
      }, (error) => {
        console.error("Blocks listener failed:", error);
        if (error.message.includes('retries')) retryTimeout = setTimeout(setupListeners, 10000);
      });

      const q = query(
        collection(db, 'matches'),
        where('userIds', 'array-contains', user.uid)
      );

      unsub = onSnapshot(q, async (snapshot) => {
        const matchData = await Promise.all(snapshot.docs.map(async (d) => {
          const data = d.data() as Match;
          const otherId = data.userIds.find(id => id !== user.uid)!;
          
          if (!profilesCache.current[otherId]) {
            const otherDoc = await getDoc(doc(db, 'users', otherId));
            profilesCache.current[otherId] = { id: otherDoc.id, ...otherDoc.data() } as UserProfile;
          }

          return { 
            id: d.id, 
            ...data, 
            otherUser: profilesCache.current[otherId]
          };
        }));
        setMatches(matchData.sort((a, b) => {
          const tA = a.timestamp?.seconds || (Date.now() / 1000);
          const tB = b.timestamp?.seconds || (Date.now() / 1000);
          return tB - tA;
        }));
        setLoading(false);
      }, (error) => {
        console.error("Matches list listener failed:", error);
        if (error.message.includes('retries')) retryTimeout = setTimeout(setupListeners, 10000);
      });
    };

    setupListeners();

    return () => {
      if (unsub) unsub();
      if (unsubBlocks) unsubBlocks();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [user]);

  // Robust event stopper helper
  const stopEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  const [pendingConfirm, setPendingConfirm] = useState<{ id: string, action: 'delete' | 'block' } | null>(null);

  const handleDeleteMatch = async (e: React.MouseEvent, m: Match & { otherUser: UserProfile }) => {
    stopEvent(e);
    if (pendingConfirm?.id !== m.id || pendingConfirm?.action !== 'delete') {
      setPendingConfirm({ id: m.id, action: 'delete' });
      setTimeout(() => setPendingConfirm(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'matches', m.id));
      const likeIds = [`${user?.uid}_${m.otherUser.id}`, `${m.otherUser.id}_${user?.uid}`];
      await Promise.all(likeIds.map(id => deleteDoc(doc(db, 'likes', id))));
      setPendingConfirm(null);
      showToast("Match desfeito com sucesso.", "info");
    } catch (error: any) {
      console.error("Error deleting match:", error);
      showToast("Erro ao desfazer match.", "error");
    }
  };

  const handleBlockUser = async (e: React.MouseEvent, m: Match & { otherUser: UserProfile }) => {
    stopEvent(e);
    if (pendingConfirm?.id !== m.id || pendingConfirm?.action !== 'block') {
      setPendingConfirm({ id: m.id, action: 'block' });
      setTimeout(() => setPendingConfirm(null), 3000);
      return;
    }

    try {
      const blockId = `${user?.uid}_${m.otherUser.id}`;
      await Promise.all([
        setDoc(doc(db, 'blocks', blockId), {
          blockerId: user?.uid,
          blockedId: m.otherUser.id,
          timestamp: serverTimestamp()
        }),
        deleteDoc(doc(db, 'matches', m.id)),
        ...[`${user?.uid}_${m.otherUser.id}`, `${m.otherUser.id}_${user?.uid}`].map(id => deleteDoc(doc(db, 'likes', id)))
      ]);
      setPendingConfirm(null);
      showToast("Usuário bloqueado.", "info");
    } catch (error: any) {
      console.error("Error blocking user:", error);
      showToast("Erro ao bloquear usuário.", "error");
    }
  };

  if (selectedMatch) {
    return (
      <Suspense fallback={<ChatLoading />}>
        <Chat 
          matchId={selectedMatch.id} 
          otherUser={selectedMatch.otherUser} 
          onBack={() => setSelectedMatch(null)} 
          showToast={showToast}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative" style={{ height: '100dvh' }}>
      <div className="p-8 pt-10 flex items-center gap-4 relative z-10">
        <button onClick={onBack} className="p-3 glass rounded-2xl text-white/60 hover:text-white transition-all shadow-lg active:scale-90">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white glow-pink">Seus Matches</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mt-1 flex items-center gap-1">
             <Heart size={10} fill="currentColor" /> {matches.length} conexões quentes
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 scrollbar-hide">
        {loading ? (
          <div className="text-center py-20 flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
             <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Carregando conexões...</p>
          </div>
        ) : matches.filter(m => !blockedUserIds.has(m.otherUser.id)).length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 glass rounded-[40px] border border-dashed border-white/10 flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-2xl">
              <MessageCircle size={40} className="text-neutral-700" />
            </div>
            <p className="text-xl font-bold italic tracking-tighter text-white">Nenhum match ainda?</p>
            <p className="text-xs text-white/40 mt-2 uppercase tracking-widest font-semibold">O role está só começando!</p>
            <button 
              onClick={onBack}
              className="mt-8 bg-pink-600 glow-pink px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all"
            >
              Voltar pro Stack
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {matches
              .filter(m => !blockedUserIds.has(m.otherUser.id))
              .map((m, idx) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={m.id}
                className="group flex items-center gap-4 p-4 glass rounded-[32px] border border-white/5 hover:border-pink-500/10 transition-all shadow-xl"
              >
                {/* Clickable Area for Chat */}
                <div 
                  onClick={() => setSelectedMatch(m)}
                  className="flex-1 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="relative">
                    <img 
                      src={m.otherUser.photoUrl} 
                      className="w-20 h-20 rounded-[24px] object-cover border border-white/10 shadow-lg" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-black rounded-full shadow-[0_0_10px_#22c55e]" />
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-xl font-black italic tracking-tighter text-white leading-none mb-1 truncate">{m.otherUser.nickname}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1 bg-pink-600/20 px-2 py-0.5 rounded-full border border-pink-500/20">
                        <span className="text-[10px]">{user && m.likeTypes?.[user.uid] ? LIKE_EMOJIS[m.likeTypes[user.uid]] : '❓'}</span>
                        <span className="text-[8px] text-pink-400 font-black">+</span>
                        <span className="text-[10px]">{LIKE_EMOJIS[m.likeTypes?.[m.otherUser.id]] || '❓'}</span>
                      </div>
                    </div>
                    <p className="text-sm text-white/40 truncate italic">
                      {m.lastMessage || "Manda um salve! 📍"}
                    </p>
                  </div>
                </div>

                {/* Actions Area - Strictly Isolated */}
                <div className="flex gap-2 relative z-20">
                  <button 
                    onClick={(e) => handleDeleteMatch(e, m)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                      pendingConfirm?.id === m.id && pendingConfirm?.action === 'delete' 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-white/5 text-white/20 hover:text-white hover:bg-neutral-800'
                    }`}
                    title={pendingConfirm?.id === m.id && pendingConfirm?.action === 'delete' ? "Clique de novo para excluir" : "Excluir Chat"}
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={(e) => handleBlockUser(e, m)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                      pendingConfirm?.id === m.id && pendingConfirm?.action === 'block' 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-white/5 text-white/20 hover:text-red-500 hover:bg-red-600/10'
                    }`}
                    title={pendingConfirm?.id === m.id && pendingConfirm?.action === 'block' ? "Clique de novo para bloquear" : "Bloquear Usuário"}
                  >
                    <Ban size={18} />
                  </button>
                  <div 
                    onClick={() => setSelectedMatch(m)}
                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 cursor-pointer hover:bg-pink-600/20 hover:text-pink-400 transition-all"
                  >
                    <MessageCircle size={18} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
