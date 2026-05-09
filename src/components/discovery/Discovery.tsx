import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { MapPin, User as UserIcon } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLocationWatcher } from '../../hooks/useLocationWatcher';
import { haversineMeters, formatDistance } from '../../utils/distance';
import { trackEvent } from '../../lib/analytics';
import type { LikeType, UserProfile, Match, BlockDoc, LikeDoc } from '../../types';
import { SwipeCard } from './SwipeCard';
import { MatchOverlay } from './MatchOverlay';

const RADIUS_METERS = 750;
const STALE_LOCATION_MS = 10 * 60 * 1000;
const MAX_PROFILES = 50;

interface DiscoveryProps {
  eventName?: string | null;
}

export function Discovery({ eventName }: DiscoveryProps) {
  const { user, profile } = useAuth();

  useLocationWatcher(user?.uid);

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [incomingLikes, setIncomingLikes] = useState<Map<string, LikeType>>(new Map());
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);
  const [acknowledgedMatchIds, setAcknowledgedMatchIds] = useState<Set<string>>(new Set());

  // One-shot getCurrentPosition for immediate use
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) setLocationDenied(true);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  // Subscribe to candidate profiles at the same event with matching gender preference
  useEffect(() => {
    if (!profile?.currentEventId || !profile.seeking?.length) {
      setProfiles([]);
      return;
    }
    const constraints = [
      where('currentEventId', '==', profile.currentEventId),
      where('gender', 'in', profile.seeking.slice(0, 10)),
      orderBy('lastActive', 'desc'),
      limit(MAX_PROFILES),
    ];
    const q = query(collection(db, 'users'), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: UserProfile[] = [];
        snap.forEach((d) => {
          if (d.id === user?.uid) return;
          const data = d.data() as DocumentData;
          // Server-side filter: candidate must be seeking my gender
          if (Array.isArray(data.seeking) && profile.gender && !data.seeking.includes(profile.gender)) {
            return;
          }
          next.push({ id: d.id, ...(data as Omit<UserProfile, 'id'>) });
        });
        setProfiles(next);
      },
      (err) => console.error('Profiles snapshot error:', err)
    );
    return () => unsub();
  }, [profile?.currentEventId, profile?.seeking?.join(','), profile?.gender, user?.uid]);

  // Blocks I created
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'blocks'), where('blockerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const ids = new Set<string>();
      snap.forEach((d) => {
        const data = d.data() as BlockDoc;
        ids.add(data.blockedId);
      });
      setBlockedIds(ids);
    });
    return () => unsub();
  }, [user?.uid]);

  // Likes pointed at me (so we know who already liked us → mutual match on like-back)
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'likes'), where('toId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const m = new Map<string, LikeType>();
      snap.forEach((d) => {
        const data = d.data() as LikeDoc;
        m.set(data.fromId, data.type);
      });
      setIncomingLikes(m);
    });
    return () => unsub();
  }, [user?.uid]);

  // New match notifications
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'matches'), where('userIds', 'array-contains', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type !== 'added') return;
        const m = { id: change.doc.id, ...(change.doc.data() as Omit<Match, 'id'>) };
        if (m.status !== 'mutual') return;
        if (acknowledgedMatchIds.has(m.id)) return;
        const otherId = m.userIds.find((u) => u !== user.uid);
        if (!otherId) return;
        try {
          const otherSnap = await getDoc(doc(db, 'users', otherId));
          if (otherSnap.exists()) {
            setMatchedUser({ id: otherSnap.id, ...(otherSnap.data() as Omit<UserProfile, 'id'>) });
            setAcknowledgedMatchIds((prev) => new Set(prev).add(m.id));
          }
        } catch (err) {
          console.error('Match user fetch failed:', err);
        }
      });
    });
    return () => unsub();
  }, [user?.uid, acknowledgedMatchIds]);

  const isLocationRecent = (u: UserProfile): boolean => {
    const ts = u.locationUpdatedAt;
    if (!ts) return true; // no timestamp → don't exclude
    const updatedMs = ts instanceof Timestamp ? ts.toMillis() : 0;
    return Date.now() - updatedMs < STALE_LOCATION_MS;
  };

  const isWithinRadius = (u: UserProfile): boolean => {
    if (!myLocation || !u.location?.lat || !u.location?.lng) return true; // fallback when location missing
    return (
      haversineMeters(myLocation.lat, myLocation.lng, u.location.lat, u.location.lng) <=
      RADIUS_METERS
    );
  };

  const visibleProfiles = useMemo(() => {
    return profiles
      .filter((p) => !blockedIds.has(p.id))
      .filter((p) => !seenIds.has(p.id))
      .filter(isLocationRecent)
      .filter(isWithinRadius);
  }, [profiles, blockedIds, seenIds, myLocation]);

  const currentCandidate = visibleProfiles[0];

  const distanceFor = (u: UserProfile): string | null => {
    if (!myLocation || !u.location?.lat || !u.location?.lng) return null;
    return formatDistance(
      haversineMeters(myLocation.lat, myLocation.lng, u.location.lat, u.location.lng)
    );
  };

  const handleLike = async (likeType: LikeType) => {
    if (!user?.uid || !currentCandidate) return;
    const targetId = currentCandidate.id;
    setSeenIds((prev) => new Set(prev).add(targetId));

    try {
      const likeId = `${user.uid}_${targetId}`;
      await setDoc(doc(db, 'likes', likeId), {
        fromId: user.uid,
        toId: targetId,
        type: likeType,
        createdAt: serverTimestamp(),
      });
      if (profile?.currentEventId) {
        trackEvent('like', profile.currentEventId, { targetId, likeType });
      }

      // If they already liked us → create mutual match
      if (incomingLikes.has(targetId)) {
        const userIds = [user.uid, targetId].sort() as [string, string];
        const matchId = userIds.join('_');
        await setDoc(doc(db, 'matches', matchId), {
          userIds,
          status: 'mutual',
          createdAt: serverTimestamp(),
        });
        if (profile?.currentEventId) {
          trackEvent('match', profile.currentEventId, { targetId });
        }
      }
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleDislike = () => {
    if (!currentCandidate) return;
    setSeenIds((prev) => new Set(prev).add(currentCandidate.id));
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[var(--color-brand-bg)]" style={{ height: '100dvh' }}>
      <header className="absolute top-0 inset-x-0 z-20 flex justify-center pt-6">
        <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-300">
            {eventName || 'Local'} · {visibleProfiles.length} por perto
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 pt-24 pb-12">
        {currentCandidate ? (
          <div className="relative w-full max-w-sm aspect-[3/4]">
            <SwipeCard
              key={currentCandidate.id}
              user={currentCandidate}
              distanceLabel={distanceFor(currentCandidate)}
              onLike={handleLike}
              onDislike={handleDislike}
            />
          </div>
        ) : locationDenied ? (
          <div className="text-center space-y-4 px-6 max-w-sm">
            <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mx-auto border border-neutral-800">
              <MapPin size={32} className="text-pink-500" />
            </div>
            <h3 className="font-bold text-xl text-white">Localização necessária</h3>
            <p className="text-neutral-500 text-sm">
              Permita o acesso à sua localização para encontrar pessoas a 750m de você.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-pink-600 rounded-full text-sm font-bold uppercase tracking-widest text-white"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mx-auto border border-neutral-800">
              <UserIcon size={32} className="text-neutral-500" />
            </div>
            <h3 className="font-bold text-xl text-white">Acabaram as pessoas!</h3>
            <p className="text-neutral-500 text-sm">
              Ninguém a 750m agora. Tente se mover ou aguarde.
            </p>
          </div>
        )}
      </main>

      {matchedUser && (
        <MatchOverlay
          matchedUser={matchedUser}
          myPhotoUrl={profile?.photoUrl}
          onClose={() => setMatchedUser(null)}
        />
      )}
    </div>
  );
}

export default Discovery;
