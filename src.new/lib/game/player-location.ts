import { BIOMES, VILLAGE_RULES } from "@/data/secretPikminWorld";
import { gameTable, isSupabaseConfigured } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import type { PlayerLocationState } from "@/types/phase4-db";
import type { BiomeKey } from "@/types/secretPikmin";

export type { PlayerLocationState };

/** Determina bioma da coordinate (deterministico per il gioco) */
export function detectBiomeFromCoords(lat: number, lng: number): BiomeKey {
  const hash = Math.abs(Math.floor(lat * 1000 + lng * 1000));
  const idx = hash % BIOMES.length;
  return BIOMES[idx].key as BiomeKey;
}

export async function fetchPlayerLocation(agentKey: string): Promise<PlayerLocationState> {
  try {
    if (isSupabaseConfigured()) {
      const { data } = await gameTable("player_profiles")
        .select("lat, lng, current_biome, updated_at")
        .eq("agent_key", agentKey)
        .maybeSingle();
      if (data) {
        return {
          lat: data.lat ?? null,
          lng: data.lng ?? null,
          current_biome: (data.current_biome as BiomeKey) ?? "bosco",
          source: data.lat != null ? "gps" : "default",
          updated_at: data.updated_at ?? new Date().toISOString(),
        };
      }
    }
  } catch {}
  return localStore.getPlayerLocation(agentKey);
}

export async function updatePlayerLocation(
  agentKey: string,
  lat: number,
  lng: number,
  source: "gps" | "manual" = "gps",
): Promise<PlayerLocationState> {
  const biome = detectBiomeFromCoords(lat, lng);
  const state: PlayerLocationState = {
    lat,
    lng,
    current_biome: biome,
    source,
    updated_at: new Date().toISOString(),
  };

  try {
    if (isSupabaseConfigured()) {
      await gameTable("player_profiles").update({
        lat,
        lng,
        current_biome: biome,
        updated_at: state.updated_at,
      }).eq("agent_key", agentKey);
    }
  } catch {}

  localStore.setPlayerLocation(agentKey, state);
  localStore.setBiome(agentKey, biome);
  return state;
}

export async function setManualBiome(agentKey: string, biome: BiomeKey): Promise<PlayerLocationState> {
  const prev = await fetchPlayerLocation(agentKey);
  const state: PlayerLocationState = {
    ...prev,
    current_biome: biome,
    source: "manual",
    updated_at: new Date().toISOString(),
  };

  try {
    if (isSupabaseConfigured()) {
      await gameTable("player_profiles").update({
        current_biome: biome,
        updated_at: state.updated_at,
      }).eq("agent_key", agentKey);
    }
  } catch {}

  localStore.setPlayerLocation(agentKey, state);
  localStore.setBiome(agentKey, biome);
  return state;
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function isWithinVillageRadius(
  playerLat: number | null,
  playerLng: number | null,
  villageLat: number | null,
  villageLng: number | null,
  radiusM = VILLAGE_RULES.actionRadiusMeters,
): boolean {
  if (playerLat == null || playerLng == null || villageLat == null || villageLng == null) return false;
  return distanceMeters({ lat: playerLat, lng: playerLng }, { lat: villageLat, lng: villageLng }) <= radiusM;
}

/** Browser geolocation wrapper */
export function requestBrowserGeolocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalizzazione non disponibile"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

export async function syncGeolocationToProfile(agentKey: string): Promise<PlayerLocationState> {
  const { lat, lng } = await requestBrowserGeolocation();
  return updatePlayerLocation(agentKey, lat, lng, "gps");
}
