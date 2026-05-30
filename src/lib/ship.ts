import { collectShipPartUnified } from "@/lib/game/ship-bridge";

/**
 * Registra un pezzo di navicella — delega a spaceship_parts (fonte primaria).
 * Mantiene compatibilità con ship_parts_collected legacy.
 */
export async function collectShipPart(opts: {
  partKey: string;
  collectedBy: string;
  source: "drop" | "mission" | "manual";
  dropId?: string | null;
  missionId?: string | null;
}) {
  const result = await collectShipPartUnified({
    partKey: opts.partKey,
    collectedBy: opts.collectedBy,
    source: opts.source,
    dropId: opts.dropId,
    missionId: opts.missionId,
  });
  return { alreadyCollected: result.alreadyCollected };
}
