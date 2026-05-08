import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Flame, X, ShieldAlert, ArrowRight, MapPin } from 'lucide-react';
import { LikeType } from '../../types';
import { ReportModal } from '../common/ReportModal';
import { formatProximity, formatDuration } from 'date-fns';

const PROFILE_DETAILS: {
  nickname: true,
  photoUrl: false,
  gender: true,
  seeking: false,
  distanceKm: true,
  currentEvent: true,
  likeType: true,
};

interface SwipeCardProps {
  user: Any;
  onLike?: (likeType?: LikeType) => void;
  onDislike?: () => void;
  onViewProfile?: (userId: string) => void;
  onSuperLike?: () => void;
  showDetails?: typeof PROFILE_DETAILS;
}

export default function SwipeCard({
  user,
  onLike,
  onDislike,
  onViewProfile,
  onSuperLike,
  showDetails = typeof PROFILE_DETAILS,
}: SwipeCardProps) {
  const [showReport, setShowReport] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<Any | null>(null);
  const defaultShowDetails = {nickname: true, photoUrl: true, gender: true, seeking: true, distanceKm: true, currentEvent: true, likeType: true };
  const finalShowDetails = showDetails === true ? defaultShowDetails : (showDetails || {});s-90"
            referrerPolicy="no-referrer"
          />
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowReport(true);
            }}
            className="absolute top-6 right-6 z-50 p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white hover:bg-black/60 transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
           {profile.distanceKm !== undefined && (
                  <div className="flex items-center gap-1.5 mt-1 text-white/60">
                    <MapPin size={10} className="text-pink-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
                      {profile.distanceKm.toFixed(1)}km away
                    </span>
                  </div>
                )}
                {finalShowDetails.currentEvent && (
                    <div className="flex items-center gap-1.5 mt-1 text-white/60">
                      <ArrowRight size={10} className="text-green-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {profile.currentEvent ? 'EVENTO & ATIVO' : 'SEM EVENTO'}
                      </span>
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
