import { useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';
import { db } from '../lib/firebase';

const LOCATION_MAX_AGE_MS = 15_000;
const LOCATION_TIMEOUT_MS = 10_000;
const MAX_ACCURACY_METERS = 100;

export function useLocationWatcher(userId?: string | null) {
  useEffect(() => {
    if (!userId || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > MAX_ACCURACY_METERS) return;

        updateDoc(doc(db, 'users', userId), {
          location: { lat: latitude, lng: longitude },
          geohash: geohashForLocation([latitude, longitude]),
          locationUpdatedAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        }).catch((err) => console.warn('Location update failed:', err));
      },
      (err) => {
        console.warn('Geolocation error:', err.code, err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: LOCATION_MAX_AGE_MS,
        timeout: LOCATION_TIMEOUT_MS,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userId]);
}
