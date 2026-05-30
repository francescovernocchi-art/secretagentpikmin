/** GPS point in WGS84 degrees. */
export interface GeoPoint { lat: number; lng: number; }

/** Haversine distance in metres between (lat1,lng1) and (lat2,lng2). */
export function calculateDistanceMeters(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Object-style version for new call-sites. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  return calculateDistanceMeters(a.lat, a.lng, b.lat, b.lng);
}

export function isWithin(a: GeoPoint, b: GeoPoint, meters: number): boolean {
  return haversineMeters(a, b) <= meters;
}

/** Sposta un punto GPS di (dx_meters East, dy_meters North). */
export function offsetMeters(
  origin: GeoPoint, dxMeters: number, dyMeters: number,
): GeoPoint {
  const R = 6371000;
  const dLat = dyMeters / R;
  const dLng = dxMeters / (R * Math.cos((origin.lat * Math.PI) / 180));
  return {
    lat: origin.lat + (dLat * 180) / Math.PI,
    lng: origin.lng + (dLng * 180) / Math.PI,
  };
}
