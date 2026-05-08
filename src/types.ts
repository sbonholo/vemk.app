export type Gender = 'man' | 'woman' | 'non-binary' | 'other';nexport type LikeType = 'light' | 'normal' | 'hot';nnexport interface UserProfile {n  id: string;n  nickname: string;n  photoUrl: string;n  gender: Gender;n  seeking: Gender[];n  location? firebase.firestore.Geopoint | null;n  geohash? string | null;n  lastActive? firebase.firestore.Timestamp | null;n  currentEventId? string | null;n  fcmToken? string | null;n  matchCount? number;n}nnexport interface Event {n  id? string;n  name? string;n  venueName? string;n  address? string;n  startsAt? firebase.firestore.Timestamp;n  endsAt? firebase.firestore.Timestamp;n  lat? number;n  lng? number;n  geohash? string;n}nnexport type Match = {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'mutual' | 'pending';
  createdAt: firebase.firestore.Timestamp;
}n
