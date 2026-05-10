import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc, onSnapshot, limit, orderBy, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { SwipeCard } from './SwipeCard';
import { MatchOverlay } from './MatchOverlay';
import { UserProfile, LikeType } from '../../types';
import { ToastType } from '../common/Toast';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, MessageCircle, User as UserIcon, Zap, Settings2 } from 'lucide-react';
import { trackEvent } from '../../lib/analytics';
import { watchLocation, getGeoBounds, getDistanceKm, formatProximity, LocationCoords } from '../../lib/location';
import { geohashForLocation } from 'geofire-common';

export function Discovery({ onGoToMatches, showToast }: { onGoToMatches: (matchId?: string) => void, showToast: (msg: string, type?: ToastType) => void }) {
  const { user, profile, checkout } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<(UserProfile & { distanceKm?: number })[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [incomingLikes, setIncomingLikes] = useState<Record<string, LikeType>>({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(profile?.location || null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);

  // Update user location in Firestore periodically or on significant change
  useEffect(() => {
    if (!user) return;

    let lastUpdateFirestore = 0;
    const watchId = watchLocation(
      (coords) => {
        // Only update local state if it's a "significant" move (> 100m)
        setUserLocation(prev => {
          if (!prev) return coords;
          const dist = getDistanceKm(prev, coords);
          return dist > 0.1 ? coords : prev;
        });
        
        // Update Firestore every 5 minutes
        const now = Date.now();
        if (now - lastUpdateFirestore > 300000) {
          lastUpdateFirestore = now;
          const hash = geohashForLocation([coords.lat, coords.lng]);
          updateDoc(doc(db, 'users', user.uid), {
            location: coords,
            geohash: hash,
            lastActive: serverTimestamp()
          }).catch(console.error);
        }
      },
      (err) => {
        console.warn("Location error:", err);
        // If denied, we still try to show event-based if possible
        if (!profile?.currentEventId) setLoading(false);
      }
    );

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, profile?.currentEventId]);

  useEffect(() => {
    if (!user || !profile) return;

    let unsubUsers: (() => void) | null = null;
    let unsubLikes: (() => void) | null = null;
    let unsubBlocks: (() => void) | null = null;
    let unsubMatches: (() => void) | null = null;
    let retryTimeout: NodeJS.Timeout;

    const setupListeners = () => {
      // 0. Fetch Current Event Details
      const fetchEvent = async () => {
        const eventDoc = await getDoc(doc(db, 'events', profile.currentEventId!));
        if (eventDoc.exists()) {
          setCurrentEvent({ id: eventDoc.id, ...eventDoc.data() });
        }
      };
      fetchEvent();

      // Listen for blocks
      const blocksQ = query(collection(db, 'blocks'), where('blockerId', '==', user.uid));
      unsubBlocks = onSnapshot(blocksQ, (snapshot) => {
        const blocked = new Set(snapshot.docs.map(d => d.data().blockedId));
        setBlockedUserIds(blocked);
      }, (error) => {
        console.error("Blocks listener failed:", error);
        if (error.message.includes('retries')) retryTimeout = setTimeout(setupListeners, 10000);
      });

      // Listen for NEW matches real-time
      const sessionStart = serverTimestamp();
      const matchesQ = query(
        collection(db, 'matches'),
        where('userIds', 'array-contains', user.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      let isFirstEmitted = true;
      unsubMatches = onSnapshot(matchesQ, (snapshot) => {
        if (isFirstEmitted) {
          isFirstEmitted = false;
          return;
        }

        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const matchData = change.doc.data();
            const matchId = change.doc.id;
            
            // Avoid showing overlay if we ALREADY showed it in handleSwipe (currentMatchId match)
            if (matchId === currentMatchId) return;

            const otherUserId = matchData.userIds.find((id: string) => id !== user.uid);
            if (!otherUserId) return;

            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
            if (otherUserDoc.exists()) {
              const otherProfile = { id: otherUserDoc.id, ...otherUserDoc.data() } as UserProfile;
              const myType = matchData.likeTypes[user.uid];
              const theirType = matchData.likeTypes[otherUserId];

              setMatchedDetails({ myType, theirType });
              setMatchedUser(otherProfile);
              setCurrentMatchId(matchId);
            }
          }
        });
      });

      // 1. Fetch Incoming Likes to show response UI
      const likesQuery = query(
        collection(db, 'likes'),
        where('toId', '==', user.uid)
      );
      
      unsubLikes = onSnapshot(likesQuery, (snapshot) => {
        const likesMap: Record<string, LikeType> = {};
        snapshot.docs.forEach(d => {
          const data = d.data();
          likesMap[data.fromId] = data.type as LikeType;
        });
        setIncomingLikes(likesMap);
      }, (error) => {
        console.error("Likes listener failed:", error);
        if (error.message.includes('retries')) retryTimeout = setTimeout(setupListeners, 10000);
      });

      // 2. Fetch Users Real-time based on Location or Event
      const fetchNearby = async () => {
        try {
          if (!userLocation && !profile.currentEventId) {
            setLoading(false);
            return;
          }

          // If in event, restricted to event. Otherwise, search by radius.
          if (profile.currentEventId) {
            const q = query(
              collection(db, 'users'),
              where('currentEventId', '==', profile.currentEventId),
              where('gender', 'in', profile.seeking),
              orderBy('lastActive', 'desc'), 
              limit(50)
            );
            
            unsubUsers = onSnapshot(q, (snapshot) => {
              const users = snapshot.docs
                .filter(d => d.id !== user.uid)
                .map(d => ({ id: d.id, ...d.data() } as UserProfile));
              
              setNearbyUsers(users);
              setLoading(false);
            }, (error) => {
              console.error("Discovery stream failed:", error);
              setLoading(false);
            });
          } else if (userLocation) {
            // Radius search using Geohashes
            const bounds = getGeoBounds(userLocation, radiusKm);
            const promises = bounds.map(b => {
               const q = query(
                 collection(db, 'users'),
                 orderBy('geohash'),
                 where('geohash', '>=', b[0]),
                 where('geohash', '<=', b[1]),
                 limit(20)
               );
               return getDocs(q);
            });

            const snapshots = await Promise.all(promises);
            const users: (UserProfile & { distanceKm?: number })[] = [];
            
            snapshots.forEach(snap => {
              snap.docs.forEach(d => {
                const u = d.data() as UserProfile;
                if (d.id === user.uid) return;
                if (!profile.seeking.includes(u.gender)) return;

                const distance = getDistanceKm(userLocation, u.location!);
                if (distance <= radiusKm) {
                  users.push({ ...u, id: d.id, distanceKm: distance });
                }
              });
            });

            // Sort by distance
            users.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
            setNearbyUsers(users);
            setLoading(false);
          }
        } catch (err) {
          console.error("fetchNearby failed:", err);
          setLoading(false);
        }
      };

      fetchNearby();
    };

    setupListeners();

    return () => {
      if (unsubLikes) unsubLikes();
      if (unsubUsers) unsubUsers();
      if (unsubBlocks) unsubBlocks();
      if (unsubMatches) unsubMatches();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [user, profile, userLocation, radiusKm]);

  const [matchedDetails, setMatchedDetails] = useState<{ myType: LikeType, theirType: LikeType } | null>(null);

  const handleCheckOut = async () => {
    try {
      await checkout();
    } catch (error) {
      console.error("Checkout failed:", error);
    }
  };

  const handleSwipe = async (userId: string, targetId: string, dir: 'left' | 'right', type: LikeType = 'normal') => {
    const eventId = profile?.currentEventId || 'default';

    try {
      if (dir === 'right') {
        trackEvent('like', eventId, { fromId: userId, toId: targetId, type });
        
        const likeId = `${userId}_${targetId}`;
        const likePromise = setDoc(doc(db, 'likes', likeId), {
          fromId: userId,
          toId: targetId,
          type,
          timestamp: serverTimestamp(),
          eventId
        });

        // Increment interaction count for robustness tracking
        const userRef = doc(db, 'users', userId);
        const incPromise = updateDoc(userRef, {
          interactionsCount: increment(1)
        });
        
        await Promise.all([likePromise, incPromise]);

        // Broad Match detection logic (Any combination of the 3 buttons)
        if (incomingLikes[targetId]) {
          const theirType = incomingLikes[targetId];
          const myType = type;
          
          trackEvent('match', eventId, { userIds: [userId, targetId], types: { [userId]: myType, [targetId]: theirType } });
          
          const matchId = [userId, targetId].sort().join('_');
          await setDoc(doc(db, 'matches', matchId), {
            userIds: [userId, targetId],
            likeTypes: {
              [userId]: myType,
              [targetId]: theirType
            },
            timestamp: serverTimestamp(),
            eventId
          });
          
          // Find matched user profile
          const matched = nearbyUsers.find(u => u.id === targetId);
          if (matched) {
            setMatchedDetails({ myType, theirType });
            setMatchedUser(matched);
            setCurrentMatchId(matchId);
          }
        }
      }
    } catch (error: any) {
      console.error("Discovery action failed:", error);
      showToast("Ops! Houve um erro na conexão.", 'error');
    }
    setCurrentIndex(prev => prev + 1);
  };

  if (loading) return <div className="flex items-center justify-center bg-black text-white" style={{ height: '100dvh' }}>Carregando o rolê...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden relative" style={{ height: '100dvh' }}>
      <AnimatePresence>
        {matchedUser && (
          <MatchOverlay 
            userProfile={profile}
            otherProfile={matchedUser}
            myType={matchedDetails?.myType}
            theirType={matchedDetails?.theirType}
            onClose={() => {
              setMatchedUser(null);
              setMatchedDetails(null);
              setCurrentMatchId(null);
            }}
            onChat={() => {
              const mid = currentMatchId;
              setMatchedUser(null);
              setMatchedDetails(null);
              setCurrentMatchId(null);
              onGoToMatches(mid || undefined);
            }}
          />
        )}
      </AnimatePresence>
      {/* Header - Immersive UI Style */}
      <header className="w-full flex justify-between items-center z-10 p-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center glow-pink font-bold text-xl italic shadow-lg">V</div>
          <span className="text-xl font-bold tracking-tighter uppercase italic text-white">VemK.</span>
        </div>
        
        <div 
          onClick={handleCheckOut}
          className="glass px-4 py-2 rounded-full flex items-center gap-2 shadow-sm cursor-pointer hover:bg-white/10 transition-colors"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-300">
            📍 {currentEvent?.name || 'Local'}
          </span>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowRadiusSelector(!showRadiusSelector)}
            className={`glass w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showRadiusSelector ? 'bg-pink-600/30' : 'hover:bg-white/10'}`}
          >
            <Settings2 size={18} className={showRadiusSelector ? 'text-pink-400' : 'text-neutral-400'} />
          </button>
          <button className="glass w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <Zap size={18} className="text-pink-500" />
          </button>
        </div>
      </header>

      {/* Radius Selector UI */}
      <AnimatePresence>
        {showRadiusSelector && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-sm glass p-4 rounded-3xl border border-white/10 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-pink-400">Raio de Busca</span>
              <span className="text-xl font-black italic">{radiusKm}km</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={radiusKm} 
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-pink-600 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-2 text-[8px] font-bold text-white/40 uppercase tracking-tighter">
              <span>Bares / Restaurantes (1-2km)</span>
              <span>Universidades / Praias (5-10km)</span>
              <span>Toda a cidade (20-50km)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Stack */}
      <div className="flex-1 relative flex items-center justify-center px-4 pb-12">
        <AnimatePresence>
          {currentIndex < nearbyUsers.filter(u => !blockedUserIds.has(u.id)).length ? (
            nearbyUsers
              .filter(u => !blockedUserIds.has(u.id))
              .slice(currentIndex, currentIndex + 2).reverse().map((otherProfile, idx) => (
              <SwipeCard 
                key={otherProfile.id} 
                profile={otherProfile} 
                receivedLikeType={incomingLikes[otherProfile.id]}
                onSwipe={(dir, type) => handleSwipe(user!.uid, otherProfile.id, dir, type)} 
                onGoToMatches={onGoToMatches}
              />
            ))
          ) : (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mx-auto border border-neutral-800">
                <UserIcon size={32} className="text-neutral-500" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Acabaram as pessoas!</h3>
                <p className="text-neutral-500 text-sm">Tente mudar sua localização ou critérios.</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
