import { VILLAGE_BUILDINGS, VILLAGE_RULES } from "@/data/secretPikminWorld";
import { gameTable, safeGameQuery, isSupabaseConfigured } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import { fetchPlayerLocation, isWithinVillageRadius } from "@/lib/game/player-location";
import { pushGameNotification } from "@/lib/game/notifications";
import type { DbVillage, DbVillageBuilding } from "@/types/phase2-db";
import type { DbVillageExtended, RemoteControlTier } from "@/types/phase4-db";
import type { BiomeKey } from "@/types/secretPikmin";

export function maxVillagesForControlCenterLevel(level: number): number {
  const rules = VILLAGE_RULES.maxVillagesByControlCenterLevel;
  if (level >= 5) return rules[5];
  if (level >= 3) return rules[3];
  return rules[1];
}

function dbVillageToExtended(v: DbVillage & Partial<DbVillageExtended>): DbVillageExtended {
  return {
    id: v.id,
    owner_agent: v.owner_agent,
    name: v.name,
    biome_key: v.biome_key,
    lat: (v as DbVillageExtended).lat ?? null,
    lng: (v as DbVillageExtended).lng ?? null,
    level: v.level,
    is_primary: v.is_primary,
    action_radius_m: (v as DbVillageExtended).action_radius_m ?? VILLAGE_RULES.actionRadiusMeters,
  };
}

export async function fetchAgentVillages(agentKey: string): Promise<{ villages: DbVillageExtended[]; source: "supabase" | "local" }> {
  const res = await safeGameQuery(
    () => gameTable("villages").select("*").eq("owner_agent", agentKey).order("is_primary", { ascending: false }),
    () => localStore.getAgentVillages(agentKey),
  );
  return { villages: (res.data as DbVillage[]).map(dbVillageToExtended), source: res.source };
}

export async function fetchActiveVillage(agentKey: string): Promise<DbVillageExtended | null> {
  const activeId = localStore.getActiveVillageId(agentKey);
  const { villages } = await fetchAgentVillages(agentKey);
  if (activeId) {
    const found = villages.find((v) => v.id === activeId);
    if (found) return found;
  }
  try {
    if (isSupabaseConfigured()) {
      const { data: profile } = await gameTable("player_profiles").select("active_village_id").eq("agent_key", agentKey).maybeSingle();
      if (profile?.active_village_id) {
        const v = villages.find((x) => x.id === profile.active_village_id);
        if (v) return v;
      }
    }
  } catch {}
  return villages.find((v) => v.is_primary) ?? villages[0] ?? null;
}

export async function setActiveVillage(agentKey: string, villageId: string): Promise<void> {
  localStore.setActiveVillageId(agentKey, villageId);
  try {
    if (isSupabaseConfigured()) {
      await gameTable("player_profiles").update({ active_village_id: villageId }).eq("agent_key", agentKey);
    }
  } catch {}
}

export async function createVillage(opts: {
  agentKey: string;
  name: string;
  biomeKey: BiomeKey;
  lat?: number | null;
  lng?: number | null;
}): Promise<{ success: boolean; village?: DbVillageExtended; message: string }> {
  const { villages } = await fetchAgentVillages(opts.agentKey);
  const primary = villages.find((v) => v.is_primary) ?? villages[0];
  const buildings = primary ? await fetchVillageBuildings(primary.id) : [];
  const cc = buildings.find((b) => b.building_key === "centro_controllo");
  const ccLevel = cc?.level ?? 1;
  const maxV = maxVillagesForControlCenterLevel(ccLevel);

  if (villages.length >= maxV) {
    return { success: false, message: `Centro Controllo Lv${ccLevel}: max ${maxV} villaggi. Potenzia il CC per espanderti.` };
  }

  const village: DbVillageExtended = {
    id: crypto.randomUUID(),
    owner_agent: opts.agentKey,
    name: opts.name,
    biome_key: opts.biomeKey,
    lat: opts.lat ?? null,
    lng: opts.lng ?? null,
    level: 1,
    is_primary: villages.length === 0,
    action_radius_m: VILLAGE_RULES.actionRadiusMeters,
  };

  const seedBuildings: DbVillageBuilding[] = VILLAGE_BUILDINGS.map((b, i) => ({
    id: `local-bld-${village.id}-${i}`,
    village_id: village.id,
    building_key: b.key,
    name: b.name,
    emoji: b.emoji,
    level: b.level,
    max_level: b.maxLevel,
    status: "active",
  }));

  try {
    if (isSupabaseConfigured()) {
      await gameTable("villages").insert({
        id: village.id,
        owner_agent: village.owner_agent,
        name: village.name,
        biome_key: village.biome_key,
        lat: village.lat,
        lng: village.lng,
        level: village.level,
        is_primary: village.is_primary,
        action_radius_m: village.action_radius_m,
      });
      for (const b of seedBuildings) {
        await gameTable("village_buildings").insert({
          village_id: b.village_id,
          building_key: b.building_key,
          name: b.name,
          emoji: b.emoji,
          level: b.level,
          max_level: b.max_level,
          status: b.status,
        });
      }
    }
  } catch {}

  localStore.addVillage(village, seedBuildings);

  await pushGameNotification({
    agentKey: opts.agentKey,
    kind: "village_created",
    title: "Nuovo villaggio creato",
    body: `${village.name} · ${village.biome_key}`,
    payload: { village_id: village.id },
  });

  if (villages.length === 0) await setActiveVillage(opts.agentKey, village.id);

  return { success: true, village, message: `Villaggio "${opts.name}" creato` };
}

export async function fetchVillageBuildings(villageId: string): Promise<DbVillageBuilding[]> {
  const res = await safeGameQuery(
    () => gameTable("village_buildings").select("*").eq("village_id", villageId).order("building_key"),
    () => localStore.getVillageBuildings(villageId),
  );
  return res.data as DbVillageBuilding[];
}

export async function fetchPrimaryVillage(agentKey: string): Promise<{
  village: DbVillage;
  buildings: DbVillageBuilding[];
  controlCenterLevel: number;
  maxVillages: number;
  source: "supabase" | "local";
}> {
  const active = await fetchActiveVillage(agentKey);
  const villageRes = await safeGameQuery(
    () => {
      if (active) return gameTable("villages").select("*").eq("id", active.id).maybeSingle();
      return gameTable("villages").select("*").eq("owner_agent", agentKey).eq("is_primary", true).maybeSingle();
    },
    () => active ?? localStore.getVillage(agentKey),
  );

  const village = villageRes.data as DbVillage;
  const buildings = await fetchVillageBuildings(village.id);
  const cc = buildings.find((b) => b.building_key === "centro_controllo");
  const controlCenterLevel = cc?.level ?? 1;

  return {
    village,
    buildings,
    controlCenterLevel,
    maxVillages: maxVillagesForControlCenterLevel(controlCenterLevel),
    source: villageRes.source,
  };
}

export async function fetchVillageCount(agentKey: string): Promise<number> {
  const { villages } = await fetchAgentVillages(agentKey);
  return villages.length;
}

export function remoteControlTier(ccLevel: number): RemoteControlTier {
  if (ccLevel >= 5) return "full";
  if (ccLevel >= 3) return "expeditions";
  if (ccLevel >= 1) return "base";
  return "none";
}

export async function canRemoteControlVillage(
  agentKey: string,
  villageId: string,
  action: "base" | "expeditions" | "market" = "base",
): Promise<{ allowed: boolean; reason: string; tier: RemoteControlTier; inRange: boolean }> {
  const { villages } = await fetchAgentVillages(agentKey);
  const village = villages.find((v) => v.id === villageId);
  if (!village) return { allowed: false, reason: "Villaggio non trovato", tier: "none", inRange: false };

  const buildings = await fetchVillageBuildings(villageId);
  const cc = buildings.find((b) => b.building_key === "centro_controllo");
  const ccLevel = cc?.level ?? 1;
  const tier = remoteControlTier(ccLevel);

  const loc = await fetchPlayerLocation(agentKey);
  const inRange = isWithinVillageRadius(loc.lat, loc.lng, village.lat, village.lng, village.action_radius_m);

  if (inRange) {
    return { allowed: true, reason: "Sei nel raggio d'azione del villaggio", tier, inRange: true };
  }

  if (tier === "none") {
    return { allowed: false, reason: "Fuori raggio — serve Centro di Controllo", tier, inRange: false };
  }

  if (action === "base" && tier !== "none") {
    return { allowed: true, reason: `Controllo remoto Lv${ccLevel} (comandi base)`, tier, inRange: false };
  }
  if (action === "expeditions" && (tier === "expeditions" || tier === "full")) {
    return { allowed: true, reason: `Controllo remoto Lv${ccLevel} (spedizioni)`, tier, inRange: false };
  }
  if (action === "market" && tier === "full") {
    return { allowed: true, reason: `Controllo remoto Lv${ccLevel} (market/trasformazioni)`, tier, inRange: false };
  }

  return {
    allowed: false,
    reason: `Fuori raggio — CC Lv${ccLevel} non consente questa azione remota`,
    tier,
    inRange: false,
  };
}

export async function upgradeVillageBuilding(
  villageId: string,
  buildingKey: string,
): Promise<{ success: boolean; buildings: DbVillageBuilding[]; message: string }> {
  const buildings = await fetchVillageBuildings(villageId);
  const idx = buildings.findIndex((b) => b.building_key === buildingKey);
  if (idx < 0) return { success: false, buildings, message: "Edificio non trovato" };
  if (buildings[idx].level >= buildings[idx].max_level) {
    return { success: false, buildings, message: "Edificio al livello massimo" };
  }

  const updated = { ...buildings[idx], level: buildings[idx].level + 1 };
  buildings[idx] = updated;

  try {
    if (isSupabaseConfigured()) {
      await gameTable("village_buildings").update({ level: updated.level }).eq("id", updated.id);
    }
  } catch {}

  localStore.setVillageBuildings(villageId, buildings);
  return { success: true, buildings, message: `${updated.name} potenziato a Lv${updated.level}` };
}
