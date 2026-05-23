// Distanze GPS reali tra coppie di coordinate.
// Formula Haversine — restituisce metri.

export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type GeoPoint = { lat: number; lng: number };

export function metersBetween(a: GeoPoint, b: GeoPoint): number {
  return calculateDistanceMeters(a.lat, a.lng, b.lat, b.lng);
}

/** Offset deterministico (metri) → lat/lng. Utile per disegnare strutture attorno al campo base. */
export function offsetMeters(origin: GeoPoint, dxMeters: number, dyMeters: number): GeoPoint {
  const dLat = dyMeters / 111320;
  const dLng = dxMeters / (111320 * Math.cos((origin.lat * Math.PI) / 180));
  return { lat: origin.lat + dLat, lng: origin.lng + dLng };
}
