/**
 * Bridge legacy ship_parts / ship_parts_collected ↔ spaceship_parts (fonte primaria Phase 2/3).
 * Mapping documentato in docs/FASE_4_REPORT.md
 */
import { supabase } from "@/integrations/supabase/client";
import { collectSpaceshipPart, fetchSpaceshipParts } from "@/lib/game/spaceship";
import { isSupabaseConfigured } from "@/lib/game/db";
import { pushGameNotification } from "@/lib/game/notifications";
import type { DbSpaceshipPart } from "@/types/phase2-db";

/** Legacy ship_parts.key → spaceship_parts.key */
export const LEGACY_TO_SPACESHIP_KEY: Record<string, string> = {
  motore: "motore",
  antenna: "antenna",
  cabina: "cabina",
  reattore: "nucleo",
  serbatoio: "modulo_energia",
  giroscopio: "stabilizzatori",
  carrello: "stabilizzatori",
  radar: "antenna",
  scafo: "stabilizzatori",
  luci: "modulo_energia",
  scudo: "nucleo",
  chiave: "nucleo",
};

export function resolveSpaceshipKey(legacyKey: string): string {
  return LEGACY_TO_SPACESHIP_KEY[legacyKey] ?? legacyKey;
}

/** Adapter per route legacy — raccoglie su spaceship_parts e mantiene ship_parts_collected */
export async function collectShipPartUnified(opts: {
  partKey: string;
  collectedBy: string;
  source?: "drop" | "mission" | "manual" | "expedition";
  dropId?: string | null;
  missionId?: string | null;
}): Promise<{ alreadyCollected: boolean; partKey: string; parts: DbSpaceshipPart[] }> {
  const spaceshipKey = resolveSpaceshipKey(opts.partKey);
  const agent =
    opts.collectedBy === "Francesco" || opts.collectedBy === "papa" || opts.collectedBy === "francesco"
      ? "papa"
      : "lorenzo";

  const { data: before } = await fetchSpaceshipParts();
  const wasCollected = before.find((p) => p.key === spaceshipKey)?.collected ?? false;

  if (isSupabaseConfigured()) {
    try {
      const { data: existing } = await supabase
        .from("ship_parts_collected")
        .select("id")
        .eq("part_key", opts.partKey)
        .maybeSingle();
      if (!existing) {
        await supabase.from("ship_parts_collected").insert({
          part_key: opts.partKey,
          collected_by: agent,
          source: opts.source ?? "manual",
          drop_id: opts.dropId ?? null,
          mission_id: opts.missionId ?? null,
        });
      }
    } catch {}
  }

  if (!wasCollected) {
    await collectSpaceshipPart(spaceshipKey, agent);
    const part = before.find((p) => p.key === spaceshipKey);
    await pushGameNotification({
      agentKey: agent,
      kind: "ship_part_found",
      title: "Pezzo navicella trovato!",
      body: part?.name ?? spaceshipKey,
      payload: { part_key: spaceshipKey, legacy_key: opts.partKey },
    });
  }

  const { data: parts } = await fetchSpaceshipParts();
  return { alreadyCollected: wasCollected, partKey: spaceshipKey, parts };
}

/** Legge stato unificato per UI legacy /navicella */
export async function fetchUnifiedShipParts(): Promise<DbSpaceshipPart[]> {
  const { data } = await fetchSpaceshipParts();
  return data;
}

/** Sincronizza collected da legacy verso spaceship (idempotente) */
export async function syncLegacyCollectedToSpaceship(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { data: collected } = await supabase.from("ship_parts_collected").select("part_key, collected_by, collected_at");
    if (!collected?.length) return;
    for (const c of collected) {
      const key = resolveSpaceshipKey(c.part_key);
      await collectSpaceshipPart(
        key,
        c.collected_by === "Francesco" ? "papa" : c.collected_by,
      );
    }
  } catch {}
}
