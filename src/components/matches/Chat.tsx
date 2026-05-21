import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, setDoc, limitToLast, getDocs, endBefore } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Message, UserProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, MapPin, ShieldAlert, Trash2, Ban } from 'lucide-react';
import { ReportModal } from '../common/ReportModal';

interface ChatProps {
  matchId: string;
  otherUser: UserProfile;
  onBack: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function Chat({ matchId, otherUser, onBack, showToast }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);

  // Initial listener for real-time updates of the latest messages
  useEffect(() => {
    if (!matchId) return;

    let unsub: (() => void) | null = null;
    let retryTimeout: NodeJS.Timeout;

    const setupListener = () => {
      // Use limitToLast to always have the most recent 10 messages in real-time
      const q = query(
        collection(db, 'matches', matchId, 'messages'),
        orderBy('timestamp', 'asc'),
        limitToLast(10)
      );

      unsub = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as Message));
        
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = msgs.filter(m => !existingIds.has(m.id));
          const updated = [...prev, ...newMsgs].sort((a, b) => {
            const tA = a.timestamp?.seconds || (Date.now() / 1000);
            const tB = b.timestamp?.seconds || (Date.now() / 1000);
            return tA - tB;
          });
          return updated;
        });

        if (snapshot.size < 10 && initialLoadRef.current) {
          setHasMore(false);
        }
        initialLoadRef.current = false;
        
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }, (error) => {
        console.error("Chat messages listener failed:", error);
        if (error.message.includes('retries')) {
          retryTimeout = setTimeout(setupListener, 10000);
        }
      });
    };

    setupListener();

    return () => {
      if (unsub) unsub();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [matchId]);

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);

    try {
      const firstMsg = messages[0];
      const q = query(
        collection(db, 'matches', matchId, 'messages'),
        orderBy('timestamp', 'asc'),
        endBefore(firstMsg.timestamp),
        limitToLast(10)
      );

      const snapshot = await getDocs(q);
      const olderMsgs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as Message));

      if (olderMsgs.length < 10) {
        setHasMore(false);
      }

      setMessages(prev => {
        const combined = [...olderMsgs, ...prev];
        return combined.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      });
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'matches', matchId, 'messages'), {
        matchId,
        senderId: user.uid,
        text: messageText,
        timestamp: serverTimestamp()
      });

      // Update last message in the match document
      await updateDoc(doc(db, 'matches', matchId), {
        lastMessage: messageText
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingBlock, setPendingBlock] = useState(false);

  const handleDeleteChat = async () => {
    if (!pendingDelete) {
      setPendingDelete(true);
      setTimeout(() => setPendingDelete(false), 3000); // Reset after 3s
      return;
    }

    try {
      console.log("Starting chat deletion for match:", matchId);
      await deleteDoc(doc(db, 'matches', matchId));
      const likeIds = [`${user?.uid}_${otherUser.id}`, `${otherUser.id}_${user?.uid}`];
      await Promise.all(likeIds.map(id => deleteDoc(doc(db, 'likes', id))));
      onBack();
    } catch (error: any) {
      console.error("Error deleting chat:", error);
      alert("Erro ao excluir chat: " + error.message);
    }
  };

  const handleBlockChat = async () => {
    if (!pendingBlock) {
      setPendingBlock(true);
      setTimeout(() => setPendingBlock(false), 3000); // Reset after 3s
      return;
    }

    try {
      console.log("Starting block for user:", otherUser.id);
      const blockId = `${user?.uid}_${otherUser.id}`;
      await Promise.all([
        setDoc(doc(db, 'blocks', blockId), {
          blockerId: user?.uid,
          blockedId: otherUser.id,
          timestamp: serverTimestamp()
        }),
        deleteDoc(doc(db, 'matches', matchId)),
        ...[`${user?.uid}_${otherUser.id}`, `${otherUser.id}_${user?.uid}`].map(id => deleteDoc(doc(db, 'likes', id)))
      ]);
      onBack();
    } catch (error: any) {
      console.error("Error blocking user:", error);
      alert("Erro ao bloquear usuário: " + error.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative" style={{ height: '100dvh' }}>
      <AnimatePresence>
        {showReport && (
          <ReportModal 
            reportedUserId={otherUser.id}
            reportedNickname={otherUser.nickname}
            onClose={() => setShowReport(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="glass p-4 pt-6 flex items-center justify-between z-10 border-b border-white/10 rounded-b-3xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <img 
              src={otherUser.photoUrl} 
              className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-lg glow-pink" 
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="font-bold italic tracking-tighter text-lg leading-none text-white">{otherUser.nickname}</h2>
              <div className="flex items-center gap-1 text-[10px] text-pink-400 font-bold uppercase tracking-widest mt-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1" />
                No rolê agora
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleBlockChat}
            className={`p-3 rounded-xl transition-all active:scale-90 ${pendingBlock ? 'bg-red-600 text-white animate-pulse' : 'text-white/20 hover:text-red-500'}`}
            title={pendingBlock ? "Clique de novo para bloquear" : "Bloquear Usuário"}
          >
            <Ban size={20} />
          </button>

          <button 
            onClick={handleDeleteChat}
            className={`p-3 rounded-xl transition-all active:scale-90 ${pendingDelete ? 'bg-red-600 text-white animate-pulse' : 'text-white/20 hover:text-red-500'}`}
            title={pendingDelete ? "Clique de novo para excluir" : "Desfazer Match"}
          >
            <Trash2 size={20} />
          </button>

          <button 
            onClick={() => setShowReport(true)}
            className="p-3 text-white/20 hover:text-red-500 transition-colors"
            title="Denunciar"
          >
            <ShieldAlert size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {hasMore && messages.length >= 10 && (
          <div className="flex justify-center pb-4">
            <button 
              onClick={loadMoreMessages}
              disabled={loadingMore}
              className="text-[10px] font-black uppercase tracking-widest text-pink-500/60 hover:text-pink-500 transition-colors"
            >
              {loadingMore ? 'Carregando...' : 'Carregar mais antigas'}
            </button>
          </div>
        )}
        
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={msg.id || idx}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[75%] p-4 rounded-2xl text-sm shadow-xl ${
                  isMe 
                    ? 'bg-pink-600 text-white rounded-tr-none glow-pink' 
                    : 'glass text-white rounded-tl-none border border-white/10'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 pt-0">
        <form 
          onSubmit={handleSend}
          className="glass flex items-center gap-2 p-2 rounded-2xl border border-white/10 shadow-2xl focus-within:border-pink-500/50 transition-all mb-4"
        >
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Manda a letra..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/20 px-4 py-2"
          />
          <button 
            type="submit"
            className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center text-white glow-pink hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <Send size={20} />
          </button>
        </form>
        
        <div className="flex justify-center gap-3 mb-2">
           <button 
             type="button"
             onClick={() => setNewMessage('Onde você tá? 📍')}
             className="glass px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-pink-400 hover:border-pink-500/30 transition-all"
           >
             📍 Onde você tá?
           </button>
           <button 
             type="button"
             onClick={() => setNewMessage('Vem pro palco! 🎸')}
             className="glass px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-pink-400 hover:border-pink-500/30 transition-all"
           >
             🎸 Vem pro palco!
           </button>
        </div>
      </div>
    </div>
  );
}
