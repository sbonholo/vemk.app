import type { Timestamp } from 'firebase/firestore';

export type Gender = 'man' | 'woman' | 'non-binary' | 'other';
export type LikeType = 'normal' | 'hot' | 'super';

export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface UserProfile {
  id: string;
  nickname: string;
  photoUrl: string;
  gender: Gender;
  seeking: Gender[];
  location?: GeoCoords | null;
  geohash?: string | null;
  locationUpdatedAt?: Timestamp | null;
  lastActive?: Timestamp | null;
  currentEventId?: string | null;
  fcmToken?: string | null;
  matchCount?: number;
}

export interface EventDoc {
  id: string;
  name: string;
  venueName?: string;
  address?: string;
  startsAt?: Timestamp;
  endsAt?: Timestamp;
  lat?: number;
  lng?: number;
  geohash?: string;
}

export interface Match {
  id: string;
  userIds: [string, string];
  status: 'pending' | 'mutual';
  createdAt: Timestamp;
}

export interface BlockDoc {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Timestamp;
}

export interface LikeDoc {
  id: string;
  fromId: string;
  toId: string;
  type: LikeType;
  createdAt: Timestamp;
}
