import React, { useState } from 'react';
import { motion, type PanInfo } from 'motion/react';
import { Heart, Flame, X, ShieldAlert, MapPin, Sparkles } from 'lucide-react';
import type { LikeType, UserProfile } from '../../types';
import { ReportModal } from '../common/ReportModal';

interface SwipeCardProps {
  user: UserProfile;
  distanceLabel?: string | null;
  onLike: (likeType: LikeType) => void;
  onDislike: () => void;
}

const SWIPE_THRESHOLD = 120;

export function SwipeCard({ user, distanceLabel, onLike, onDislike }: SwipeCardProps) {
  const [showReport, setShowReport] = useState(false);

  const handleDragEnd = (_e: any, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onLike('normal');
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onDislike();
    }
  };

  return (
    <>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
        className="absolute inset-0 rounded-[40px] overflow-hidden glass shadow-2xl border border-white/5 select-none cursor-grab active:cursor-grabbing"
      >
        <img
          src={user.photoUrl || '/photos/default-avatar.jpg'}
          alt={user.nickname}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowReport(true);
          }}
          className="absolute top-6 right-6 z-30 p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white hover:bg-black/60 transition-colors"
          aria-label="Denunciar"
        >
          <ShieldAlert className="w-4 h-4" />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-6 pb-8 bg-gradient-to-t from-black via-black/70 to-transparent">
          <div className="space-y-2">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none">
              {user.nickname}
            </h2>
            {distanceLabel && (
              <div className="flex items-center gap-1.5 text-pink-400">
                <MapPin size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">{distanceLabel}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={onDislike}
              className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Pular"
            >
              <X className="w-7 h-7 text-white" />
            </button>
            <button
              onClick={() => onLike('normal')}
              className="w-20 h-20 rounded-full bg-pink-600 glow-pink flex items-center justify-center hover:scale-105 transition-transform"
              aria-label="Curtir"
            >
              <Heart className="w-9 h-9 text-white fill-white" />
            </button>
            <button
              onClick={() => onLike('hot')}
              className="w-16 h-16 rounded-full bg-orange-500/90 flex items-center justify-center hover:scale-105 transition-transform"
              aria-label="Hot like"
            >
              <Flame className="w-7 h-7 text-white" />
            </button>
            <button
              onClick={() => onLike('super')}
              className="w-16 h-16 rounded-full bg-yellow-400/90 flex items-center justify-center hover:scale-105 transition-transform"
              aria-label="Super like"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </button>
          </div>
        </div>
      </motion.div>

      {showReport && (
        <ReportModal reportedUserId={user.id} onClose={() => setShowReport(false)} />
      )}
    </>
  );
}

export default SwipeCard;
