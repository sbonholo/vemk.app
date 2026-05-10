import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, X } from 'lucide-react';
import type { UserProfile } from '../../types';

interface MatchOverlayProps {
  matchedUser: UserProfile;
  myPhotoUrl?: string | null;
  onClose: () => void;
  onOpenChat?: () => void;
}

export function MatchOverlay({ matchedUser, myPhotoUrl, onClose, onOpenChat }: MatchOverlayProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.85, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-sm flex flex-col items-center gap-6"
        >
          <div className="flex items-center gap-2 text-pink-500">
            <Heart className="w-6 h-6 fill-pink-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Match!</span>
            <Heart className="w-6 h-6 fill-pink-500 animate-pulse" />
          </div>

          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white text-center leading-none">
            Deu match com<br />
            <span className="text-pink-500">{matchedUser.nickname}</span>
          </h1>

          <div className="flex items-center gap-4">
            <img
              src={myPhotoUrl || '/photos/default-avatar.jpg'}
              alt="você"
              className="w-28 h-28 rounded-full object-cover border-4 border-pink-500"
              referrerPolicy="no-referrer"
            />
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
            <img
              src={matchedUser.photoUrl || '/photos/default-avatar.jpg'}
              alt={matchedUser.nickname}
              className="w-28 h-28 rounded-full object-cover border-4 border-pink-500"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="w-full flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl glass text-white text-xs font-black uppercase tracking-widest"
            >
              <X size={16} /> Mais tarde
            </button>
            <button
              onClick={onOpenChat || onClose}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-pink-600 text-white text-xs font-black uppercase tracking-widest glow-pink"
            >
              <MessageCircle size={16} /> Conversar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default MatchOverlay;
