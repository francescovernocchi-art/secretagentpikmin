import { gameTable, safeGameQuery } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import type { DbPikminUnit } from "@/types/phase2-db";
import type { PikminSpecializationKey, PikminUnit } from "@/types/secretPikmin";

export function dbToPikminUnit(row: DbPikminUnit): PikminUnit {
  return {
    id: row.id,
    name: row.name,
    type: row.type_key,
    level: row.level,
    experience: row.experience,
    experienceToNext: row.experience_to_next,
    specialization: (row.specialization_key ?? "raccolta") as PikminSpecializationKey,
    stats: row.stats,
    preferredBiome: row.preferred_biome,
    story: row.story ?? "",
    status: row.status as PikminUnit["status"],
    ownerId: row.owner_agent === "papa" ? "francesco" : row.owner_agent,
    specBadge: row.spec_badge ?? null,
  };
}

export async function fetchPikminUnits(ownerAgent?: string): Promise<{ data: PikminUnit[]; source: "supabase" | "local" }> {
  const res = await safeGameQuery(
    () => {
      let q = gameTable("pikmin_units").select("*").order("created_at");
      if (ownerAgent) q = q.eq("owner_agent", ownerAgent);
      return q;
    },
    () => localStore.getPikminUnits(ownerAgent),
  );
  return { data: (res.data as DbPikminUnit[]).map(dbToPikminUnit), source: res.source };
}

export async function updatePikminSpecialization(
  unitId: string,
  specialization: PikminSpecializationKey,
): Promise<{ data: PikminUnit[]; source: "supabase" | "local" }> {
  try {
    const { error } = await gameTable("pikmin_units")
      .update({ specialization_key: specialization, updated_at: new Date().toISOString() })
      .eq("id", unitId);
    if (error) throw error;
  } catch {
    const units = localStore.getPikminUnits();
    localStore.setPikminUnits(
      units.map((u) => (u.id === unitId ? { ...u, specialization_key: specialization } : u)),
    );
  }
  const owner = localStore.getPikminUnits().find((u) => u.id === unitId)?.owner_agent;
  return fetchPikminUnits(owner);
}

export async function addPikminUnit(opts: {
  ownerAgent: string;
  name: string;
  typeKey: string;
  specialization?: PikminSpecializationKey;
  preferredBiome?: string;
}): Promise<void> {
  const row = {
    owner_agent: opts.ownerAgent,
    name: opts.name,
    type_key: opts.typeKey,
    specialization_key: opts.specialization ?? "raccolta",
    preferred_biome: opts.preferredBiome ?? "bosco",
    level: 1,
    experience: 0,
    experience_to_next: 200,
    status: "disponibile",
    story: "Trovato con lo scanner area.",
    stats: { forza: 50, velocita: 50, resistenza: 50, intelligenza: 50 },
  };

  try {
    const { error } = await gameTable("pikmin_units").insert(row);
    if (error) throw error;
  } catch {
    const units = localStore.getPikminUnits();
    units.push({
      id: `local-pk-${Date.now()}`,
      ...row,
      type_key: row.type_key as DbPikminUnit["type_key"],
      specialization_key: row.specialization_key as PikminSpecializationKey,
      preferred_biome: row.preferred_biome as DbPikminUnit["preferred_biome"],
      stats: row.stats,
      story: row.story,
    });
    localStore.setPikminUnits(units);
  }
}
