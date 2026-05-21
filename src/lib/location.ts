import { distanceBetween, geohashQueryBounds } from 'geofire-common';

export interface LocationCoords {
  lat: number;
  lng: number;
}

export function getDistanceKm(p1: LocationCoords, p2: LocationCoords): number {
  return distanceBetween([p1.lat, p1.lng], [p2.lat, p2.lng]);
}

export function getGeohashPrecision(radiusKm: number): number {
  if (radiusKm <= 0.049) return 9;
  if (radiusKm <= 0.156) return 8;
  if (radiusKm <= 0.5) return 7;
  if (radiusKm <= 1.58) return 6;
  if (radiusKm <= 4.99) return 5;
  return 4;
}

export function getQueryBounds(center: LocationCoords, radiusM: number) {
  return geohashQueryBounds([center.lat, center.lng], radiusM);
}

export function startLocationWatch(
  onUpdate: (coords: LocationCoords) => void,
  onError: (error: string) => void
): () => void {
  if (!navigator.geolocation) {
    onError('Geolocation not supported by this browser');
    return () => {};
  }

  let last: LocationCoords | null = null;
  const MIN_DELTA_KM = 0.0001;

  const watcherId = navigator.geolocation.watchPosition(
    (position) => {
      const next: LocationCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      if (last && getDistanceKm(last, next) < MIN_DELTA_KM) return;
      last = next;
      onUpdate(next);
    },
    (error) => onError(error.message),
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
  );

  return () => navigator.geolocation.clearWatch(watcherId);
}
