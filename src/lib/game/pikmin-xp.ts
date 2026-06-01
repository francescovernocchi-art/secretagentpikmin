import { gameTable, isSupabaseConfigured } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import type { DbPikminUnit } from "@/types/phase2-db";
import type { DbPikminActivityLog, PikminXpReason } from "@/types/phase3-db";
import { SPEC_BADGES } from "@/types/phase3-db";
import type { PikminSpecializationKey } from "@/types/secretPikmin";

export function xpToNextLevel(level: number): number {
  return Math.floor(100 + level * 80 + level * level * 10);
}

export function specBadgeForLevel(spec: PikminSpecializationKey | null, level: number): string | null {
  if (!spec) return null;
  const badges = SPEC_BADGES[spec];
  if (level >= 8) return badges[2];
  if (level >= 5) return badges[1];
  if (level >= 3) return badges[0];
  return null;
}

function applyXpToUnit(unit: DbPikminUnit, amount: number): { unit: DbPikminUnit; leveledUp: boolean; levelsGained: number } {
  let xp = unit.experience + amount;
  let level = unit.level;
  let toNext = unit.experience_to_next;
  let levelsGained = 0;
  const startLevel = level;

  while (xp >= toNext && level < 20) {
    xp -= toNext;
    level++;
    levelsGained++;
    toNext = xpToNextLevel(level);
  }

  const spec = unit.specialization_key as PikminSpecializationKey | null;
  const badge = specBadgeForLevel(spec, level);
  const statBoost = levelsGained > 0 ? 2 : 0;

  return {
    unit: {
      ...unit,
      experience: xp,
      level,
      experience_to_next: toNext,
      total_xp_earned: (unit as DbPikminUnit & { total_xp_earned?: number }).total_xp_earned
        ? (unit as DbPikminUnit & { total_xp_earned: number }).total_xp_earned + amount
        : amount,
      spec_badge: badge ?? unit.spec_badge ?? null,
      stats: statBoost
        ? {
            forza: Math.min(99, unit.stats.forza + statBoost),
            velocita: Math.min(99, unit.stats.velocita + statBoost),
            resistenza: Math.min(99, unit.stats.resistenza + statBoost),
            intelligenza: Math.min(99, unit.stats.intelligenza + statBoost),
          }
        : unit.stats,
      updated_at: new Date().toISOString(),
    } as DbPikminUnit,
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}

async function logActivity(entry: Omit<DbPikminActivityLog, "id" | "created_at">) {
  const row = { ...entry, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  try {
    if (isSupabaseConfigured()) {
      await gameTable("pikmin_activity_log").insert({
        pikmin_id: entry.pikmin_id,
        owner_agent: entry.owner_agent,
        reason: entry.reason,
        xp_amount: entry.xp_amount,
        meta: entry.meta,
      });
    }
  } catch {}
  localStore.addActivityLog(row);
}

export async function addPikminXp(
  pikminId: string,
  amount: number,
  reason: PikminXpReason | string,
  meta?: Record<string, unknown>,
): Promise<{ leveledUp: boolean; newLevel: number }> {
  if (amount <= 0) return { leveledUp: false, newLevel: 0 };

  const units = localStore.getPikminUnits();
  const idx = units.findIndex((u) => u.id === pikminId);
  if (idx < 0) {
    try {
      const { data } = await gameTable("pikmin_units").select("*").eq("id", pikminId).maybeSingle();
      if (!data) return { leveledUp: false, newLevel: 0 };
      const { unit, leveledUp } = applyXpToUnit(data as DbPikminUnit, amount);
      await gameTable("pikmin_units").update({
        experience: unit.experience,
        level: unit.level,
        experience_to_next: unit.experience_to_next,
        stats: unit.stats,
        spec_badge: (unit as DbPikminUnit & { spec_badge?: string }).spec_badge,
        total_xp_earned: (unit as DbPikminUnit & { total_xp_earned?: number }).total_xp_earned,
        updated_at: unit.updated_at,
      }).eq("id", pikminId);
      await logActivity({ pikmin_id: pikminId, owner_agent: unit.owner_agent, reason, xp_amount: amount, meta: meta ?? {} });
      return { leveledUp, newLevel: unit.level };
    } catch {
      return { leveledUp: false, newLevel: 0 };
    }
  }

  const { unit, leveledUp } = applyXpToUnit(units[idx], amount);
  units[idx] = unit;
  localStore.setPikminUnits(units);

  try {
    if (isSupabaseConfigured()) {
      await gameTable("pikmin_units").update({
        experience: unit.experience,
        level: unit.level,
        experience_to_next: unit.experience_to_next,
        stats: unit.stats,
        spec_badge: (unit as DbPikminUnit & { spec_badge?: string }).spec_badge,
        total_xp_earned: (unit as DbPikminUnit & { total_xp_earned?: number }).total_xp_earned ?? amount,
        updated_at: unit.updated_at,
      }).eq("id", pikminId);
    }
  } catch {}

  await logActivity({ pikmin_id: pikminId, owner_agent: unit.owner_agent, reason, xp_amount: amount, meta: meta ?? {} });
  return { leveledUp, newLevel: unit.level };
}

/** Assegna XP a tutti i Pikmin disponibili dell'agente (es. scansione di squadra) */
export async function addXpToAvailableSquad(
  ownerAgent: string,
  amount: number,
  reason: PikminXpReason,
  limit = 3,
): Promise<number> {
  const units = localStore.getPikminUnits(ownerAgent).filter((u) => u.status === "disponibile").slice(0, limit);
  let count = 0;
  for (const u of units) {
    await addPikminXp(u.id, amount, reason);
    count++;
  }
  return count;
}

export async function addXpToPikminIds(ids: string[], amount: number, reason: PikminXpReason): Promise<void> {
  for (const id of ids) {
    await addPikminXp(id, amount, reason);
  }
}

export async function fetchActivityLog(pikminId?: string, limit = 20): Promise<DbPikminActivityLog[]> {
  const logs = localStore.getActivityLogs();
  const filtered = pikminId ? logs.filter((l) => l.pikmin_id === pikminId) : logs;
  return filtered.slice(0, limit);
}

export const XP_AMOUNTS: Record<PikminXpReason, number> = {
  scan: 15,
  raccolta: 12,
  pikmin_selvatico: 20,
  studio_mostro: 25,
  pezzo_navicella: 50,
  spedizione: 30,
  vendita: 10,
  trasformazione: 8,
  difesa: 35,
};
