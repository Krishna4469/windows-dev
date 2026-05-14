export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface HasCoords {
  latitude: string | number | null;
  longitude: string | number | null;
}

export function findNearbyVenues<T extends HasCoords>(
  userLat: number,
  userLng: number,
  radiusKm: number,
  venues: T[],
): Array<T & { distance_km: number }> {
  return venues
    .map((v) => ({
      ...v,
      distance_km:
        Math.round(
          calculateDistance(
            userLat,
            userLng,
            parseFloat(String(v.latitude ?? '0')),
            parseFloat(String(v.longitude ?? '0')),
          ) * 10,
        ) / 10,
    }))
    .filter((v) => v.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}

export function generateGoogleMapsURL(latitude: number, longitude: number, venueName: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodeURIComponent(venueName)}`;
}
