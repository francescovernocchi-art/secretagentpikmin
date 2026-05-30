import { gameTable, isSupabaseConfigured } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import { addXpToAvailableSquad, XP_AMOUNTS } from "@/lib/game/pikmin-xp";
import { pushGameNotification } from "@/lib/game/notifications";
import type { DbBestiaryEntry } from "@/types/phase2-db";
import type { BestiaryStudyStatus } from "@/types/phase3-db";
import type { BiomeKey } from "@/types/secretPikmin";

const WEAKNESS_HINTS: Record<string, string> = {
  bulborb: "attacco dorsale",
  scarabee: "schiacciamento",
  schnautz: "esplosione",
  grog: "acqua",
  arachnode: "lancio dall'alto",
  default: "coordinazione squadra",
};

function studyStatusFromPoints(points: number, scanCount: number): BestiaryStudyStatus {
  if (points >= 8 || scanCount >= 5) return "classificato";
  if (points >= 4 || scanCount >= 2) return "studiato";
  return "avvistato";
}

function dataPointsForEncounter(isNew: boolean): number {
  return isNew ? 2 : 1;
}

export async function recordMonsterEncounter(opts: {
  creatureKey: string;
  name: string;
  emoji: string;
  biomeKey: BiomeKey;
  discoveredBy: string;
  source?: "scan" | "spedizione";
}): Promise<{ entry: DbBestiaryEntry; statusLabel: string; weaknessUnlocked: boolean }> {
  const weaknessBase = WEAKNESS_HINTS[opts.creatureKey.split("_")[0]] ?? WEAKNESS_HINTS.default;

  let existing: DbBestiaryEntry | null = null;
  try {
    if (isSupabaseConfigured()) {
      const { data } = await gameTable("bestiary_entries").select("*").eq("creature_key", opts.creatureKey).maybeSingle();
      existing = data as DbBestiaryEntry | null;
    }
  } catch {}

  if (!existing) {
    existing = localStore.getBestiary().find((e) => e.creature_key === opts.creatureKey) ?? null;
  }

  const isNew = !existing;
  const prevPoints = existing?.data_points ?? 0;
  const prevScans = existing?.scan_count ?? 0;
  const dataPoints = prevPoints + dataPointsForEncounter(isNew);
  const scanCount = prevScans + 1;
  const studyStatus = studyStatusFromPoints(dataPoints, scanCount);
  const weaknessUnlocked = studyStatus === "classificato" || dataPoints >= 8;

  const entry: DbBestiaryEntry = {
    id: existing?.id ?? crypto.randomUUID(),
    creature_key: opts.creatureKey,
    name: opts.name,
    emoji: opts.emoji,
    biome_key: opts.biomeKey,
    rarity: existing?.rarity ?? "comune",
    danger_level: existing?.danger_level ?? 2,
    weakness: weaknessUnlocked ? weaknessBase : existing?.weakness ?? null,
    discovered_by: existing?.discovered_by ?? opts.discoveredBy,
    scan_count: scanCount,
    study_status: studyStatus,
    data_points: dataPoints,
    weakness_unlocked: weaknessUnlocked,
  };

  try {
    if (isSupabaseConfigured()) {
      if (existing?.id && !isNew) {
        await gameTable("bestiary_entries").update({
          scan_count: scanCount,
          data_points: dataPoints,
          study_status: studyStatus,
          weakness: entry.weakness,
          weakness_unlocked: weaknessUnlocked,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await gameTable("bestiary_entries").insert({
          creature_key: entry.creature_key,
          name: entry.name,
          emoji: entry.emoji,
          biome_key: entry.biome_key,
          discovered_by: entry.discovered_by,
          scan_count: scanCount,
          data_points: dataPoints,
          study_status: studyStatus,
          weakness: entry.weakness,
          weakness_unlocked: weaknessUnlocked,
        });
      }
    }
  } catch {
    localStore.upsertBestiary(entry);
  }

  if (!isSupabaseConfigured()) localStore.upsertBestiary(entry);

  await addXpToAvailableSquad(opts.discoveredBy, XP_AMOUNTS.studio_mostro, "studio_mostro", 2);

  if (studyStatus === "classificato") {
    await pushGameNotification({
      agentKey: opts.discoveredBy,
      kind: "monster_classified",
      title: "Mostro classificato!",
      body: `${opts.name} — debolezza ${weaknessUnlocked ? "sbloccata" : "in analisi"}`,
      payload: { creature_key: opts.creatureKey },
    });
  }

  const statusLabel =
    studyStatus === "classificato" ? "Classificato" : studyStatus === "studiato" ? "Studiato" : "Avvistato";

  return { entry, statusLabel, weaknessUnlocked };
}

export async function fetchBestiaryEntries(): Promise<{ data: DbBestiaryEntry[]; source: "supabase" | "local" }> {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await gameTable("bestiary_entries").select("*").order("scan_count", { ascending: false });
      if (error) throw error;
      return { data: (data ?? []) as DbBestiaryEntry[], source: "supabase" };
    }
  } catch {}
  return { data: localStore.getBestiary(), source: "local" };
}

export function studyStatusEmoji(status: BestiaryStudyStatus): string {
  if (status === "classificato") return "📋";
  if (status === "studiato") return "🔬";
  return "👁️";
}
