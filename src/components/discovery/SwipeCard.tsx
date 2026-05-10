import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Flame, X, ShieldAlert, ArrowRight, MapPin } from 'lucide-react';
import { LikeType } from '../../types';
import { ReportModal } from '../common/ReportModal';
import { formatProximity } from '../../lib/location';

const LIKE_TYPES: Record<LikeType, { label: string; emoji: string; color: string }> = {
  light: { label: 'Gostou de vc', emoji: '❤️', color: 'text-pink-400' },
  normal: { label: 'Chega beijando', emoji: '💋', color: 'text-pink-500' },
  hot: { label: 'Hoje tem!', emoji: '🔥', color: 'text-red-500' },
};

interface SwipeCardProps {
  key?: React.Key;
  profile: {
    id: string;
    nickname: string;
    photoUrl: string;
    gender: string;
    distanceKm?: number;
  };
  receivedLikeType?: LikeType;
  onSwipe: (dir: 'left' | 'right', type?: LikeType) => void | Promise<void>;
  onGoToMatches: () => void;
}

export function SwipeCard({ profile, onSwipe, receivedLikeType, onGoToMatches }: SwipeCardProps) {
  const [showReport, setShowReport] = React.useState(false);
  const lastClickTime = React.useRef(0);

  const handleAction = (dir: 'left' | 'right', type?: LikeType) => {
    const now = Date.now();
    if (now - lastClickTime.current < 500) return;
    lastClickTime.current = now;
    onSwipe(dir, type);
  };

  return (
    <>
      <AnimatePresence>
        {showReport && (
          <ReportModal 
            reportedUserId={profile.id}
            reportedNickname={profile.nickname}
            onClose={() => setShowReport(false)}
          />
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 mx-auto w-[360px] h-[580px] z-30 flex flex-col items-center">
        <div className="relative w-full h-[480px] rounded-[40px] overflow-hidden glass shadow-2xl border border-white/20">
          <img
            src={profile.photoUrl || `https://picsum.photos/seed/${profile.id}/600/800`}
            alt={profile.nickname}
            className="absolute inset-0 w-full h-full object-cover select-none grayscale-[10%] brightness-90"
            referrerPolicy="no-referrer"
          />
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowReport(true);
            }}
            className="absolute top-6 right-6 z-50 p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white/20 hover:text-red-500 transition-all border border-white/5 active:scale-95"
            title="Denunciar canalha"
          >
            <ShieldAlert size={18} />
          </button>

          {/* Overlays */}
          <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black via-black/60 to-transparent">
            <div className="flex justify-between items-end mb-2">
              <div>
                {receivedLikeType ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onGoToMatches();
                    }}
                    className="group/tag flex items-center gap-2 mb-2 p-2 bg-pink-600/20 backdrop-blur-md rounded-xl border border-pink-500/30 animate-bounce active:scale-95 transition-all text-left"
                  >
                    <span className="text-sm">{LIKE_TYPES[receivedLikeType].emoji}</span>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-pink-400 leading-none">{LIKE_TYPES[receivedLikeType].label}</span>
                      <span className="text-[7px] text-pink-500/60 font-bold uppercase tracking-tighter mt-0.5 flex items-center gap-0.5">Clique para ver matches <ArrowRight size={8} /></span>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Iniciativa sua:</span>
                  </div>
                )}
                <h2 className="text-4xl font-black italic tracking-tighter text-white leading-tight">{profile.nickname}</h2>
                {profile.distanceKm !== undefined && (
                  <div className="flex items-center gap-1.5 mt-1 text-white/60">
                    <MapPin size={10} className="text-pink-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
                      {formatProximity(profile.distanceKm)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
               <span className="bg-white/10 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-bold uppercase border border-white/10 text-white/80 tracking-widest leading-none">{profile.gender}</span>
            </div>
          </div>
        </div>

        {/* Reaction Buttons */}
        <div className="mt-6 flex items-center justify-center gap-6 w-full">
          <button 
            onClick={() => handleAction('left')}
            className="w-16 h-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center text-neutral-400 hover:scale-110 active:scale-90 transition-all shadow-xl"
            title="Pular"
          >
            <X size={32} />
          </button>
          
          <button 
            onClick={() => handleAction('right', 'normal')}
            className="w-20 h-20 rounded-full glass border border-pink-500/30 flex items-center justify-center text-pink-500 hover:scale-110 active:scale-90 glow-pink transition-all shadow-2xl"
            title="Adorei"
          >
            <Heart size={40} fill="currentColor" fillOpacity={0.2} />
          </button>

          <button 
            onClick={() => handleAction('right', 'hot')}
            className="w-16 h-16 rounded-full bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-500 hover:scale-110 active:scale-90 transition-all shadow-xl"
            title="Hoje tem!"
          >
            <Flame size={32} fill="currentColor" fillOpacity={0.2} />
          </button>
        </div>
      </div>
    </>
  );
}
