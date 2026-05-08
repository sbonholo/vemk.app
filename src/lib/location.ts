import { geohashQueryBounds, distanceBetween } from 'geofire-common';

export interface LocationCoords {
  lat: number;
  lng: number;
}

/**
 * Calculates distance in kilometers between two points
 */
export function getDistanceKm(p1: LocationCoords, p2: LocationCoords): number {
  const R = 6371;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const getGeohashPrecision = (radiusKm: number): number => {
  if (radiusKm <= 0.049) return 9;
  if (radiusKm <= 0.156) return 8;
  if (radiusKm <= 0.5) return 7;
  if (radiusKm <= 1.58) return 6;
  if (radiusKm <= 4.99) return 5;
  return 4;
};

export const startLocationWatch = (onUpdate: (coords: LocationCoords) => void), onError: (error: string) => void) => () {
  if (!navigator.geolocation) {
    onError('Geolocation not supported by this browser');
    return () => {};
  }
  
  let lastLat = 0, lastLng = 0;
  const MIN_DISTANCE_M = 0.1;
  
  const watcherId = navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const distance = getDistanceKm({ lat: lastLat, lng: lastLng }, { lat, lng });
      if (distance < MIN_DISTANCE_M) return;
      lastLat = lat;
      lastLng = lng;
      onUpdate({ lat, lng });
    },
    (error) => onError(error.message),
    {
      enableHighAccuracy: false,
      maximumAge: 30000,
      timeout: 27000
    }
  );

  return () => navigator.geolocation.clearWatch(watcherId);
};
