import { calculateDistanceMeters, type GeoPoint } from "@/lib/geo/distance";

// Raggi principali del sistema geolocalizzato.
export const PLAYER_ATTACK_RADIUS = 200;       // metri: attacco diretto del giocatore
export const BASE_ACTION_RADIUS_DEFAULT = 300; // metri: raggio operativo Campo Base
export const BASE_THREAT_RADIUS_DEFAULT = 300; // metri: raggio in cui un mostro minaccia la base
export const SCOUTING_MIN_DISTANCE = 200;      // metri: oltre questo, solo spionaggio

export function canAttackEnemy(player: GeoPoint | null, enemy: GeoPoint): boolean {
  if (!player) return false;
  return calculateDistanceMeters(player.lat, player.lng, enemy.lat, enemy.lng) <= PLAYER_ATTACK_RADIUS;
}

export function canScoutEnemy(player: GeoPoint | null, enemy: GeoPoint): boolean {
  if (!player) return false;
  return calculateDistanceMeters(player.lat, player.lng, enemy.lat, enemy.lng) > SCOUTING_MIN_DISTANCE;
}

export function canThreatenBase(
  base: GeoPoint | null,
  enemy: GeoPoint,
  threatRadius: number = BASE_THREAT_RADIUS_DEFAULT,
): boolean {
  if (!base) return false;
  return calculateDistanceMeters(base.lat, base.lng, enemy.lat, enemy.lng) <= threatRadius;
}

/** Calcola durata stimata di una missione di spionaggio in base alla distanza (cap 5 min). */
export function scoutingDurationSeconds(distanceMeters: number): number {
  const base = 60; // 1 minuto minimo
  const perHundred = 30; // +30s ogni 100m
  return Math.min(300, Math.round(base + (distanceMeters / 100) * perHundred));
}
