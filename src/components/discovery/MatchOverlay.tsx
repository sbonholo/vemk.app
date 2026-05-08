import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { MessageCircle, Heart, Flame, Sparkles, X } from 'lucide-react';
import { LikeType } from '../../types';

const LIKE_INFO: Record<LikeType, { icon: JSX.Element }> = {
  normal: { icon: <Heart size={24} className="text-white opacity-75" /> },
  hot: { icon: <Flame size={24} className="text-orange-400" /> },
  super: { icon: <Sparkles size={24} className="text-yellow-300" /> },
};

interface MatchOverlayProps {
  matchedUser: UserProfile;
  onClose: () => void;
  onSuperLike?: () => void;
}

export default function MatchOverlay({ matchedUser, onClose, onSuperLike }: MatchOverlayProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-black/40 flex flex-col items-center justify-center"
      >
        <div className="w-full max-w-sm py-8">
          <h2 className="text-xl font-bold text-white mb-2">è¨ hivi um match!</h2>
          <img src={matchedUser.photoUrl || '/photos/default-avatar.jpg'}
                alt={matchedUser.nickname || 'Usuá¡rio'} className="w-32 h-32 rounded-full object-cover mb-4 ring-4 ring-white" />bounce" />
            <Heart className="text-red-500 animate-pulse" />
          </div>
          <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none text-white glow-pink">
            DEU <br />
            <span className="text-transparent bg-clip-text bg-white/20 px-4 py-2 rounded-lg">
              {matchedUser.nickname}
            </span>
          </h1>
          <div className="flex gap-4 w-full">
            {Object.entries(LIKE_INFO).map(([likeType, { label, icon }]) => (
              <motion.button
                key={likeType}
                onClick={() => onSuperLike?()}
                className="flex flex-col items-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                {icon}
                <span className="text-sm font-semibold">{label}</span>
              </motion.button>
            ))}
          </div>
          <div className="w-full h-px bg-white/10"></div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 py-3 px-6 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white opacity-75" />
              NÃ£o agora
            </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 py-4 px-8 rounded-xl bg-[var(--color-brand-pink)] text-white font-semibold text-sm hover:opacity-90 transition-colors"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Ir ao chat!
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
der-4 border-pink-600 overflow-hidden shadow-2xl relative z-10"
          >
            <img 
              src={otherProfile.photoUrl} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {theirType && (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-purple-600/70 z-10">
                {theirType === 'super' ? 'SUPER LIKE! ð¥ ðA' : theirType === 'hot' ? 'HOT! ð¡' : 'LIKED ð'}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
