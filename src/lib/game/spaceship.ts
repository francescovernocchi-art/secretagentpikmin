import { gameTable, safeGameQuery } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import { addXpToAvailableSquad, XP_AMOUNTS } from "@/lib/game/pikmin-xp";
import type { DbSpaceshipPart } from "@/types/phase2-db";

export async function fetchSpaceshipParts(): Promise<{ data: DbSpaceshipPart[]; source: "supabase" | "local" }> {
  return safeGameQuery(
    () => gameTable("spaceship_parts").select("*").order("sort_order"),
    () => localStore.getShipParts(),
  );
}

export async function collectSpaceshipPart(
  partKey: string,
  collectedBy: string,
): Promise<{ data: DbSpaceshipPart[]; source: "supabase" | "local" }> {
  const agent = collectedBy === "Francesco" || collectedBy === "papa" ? "papa" : "lorenzo";

  try {
    const { error } = await gameTable("spaceship_parts")
      .update({
        collected: true,
        collected_by: agent,
        collected_at: new Date().toISOString(),
      })
      .eq("key", partKey)
      .eq("collected", false);
    if (error) throw error;
    await addXpToAvailableSquad(agent, XP_AMOUNTS.pezzo_navicella, "pezzo_navicella", 3);
    return fetchSpaceshipParts();
  } catch {
    const parts = localStore.getShipParts().map((p) =>
      p.key === partKey ? { ...p, collected: true, collected_by: agent, collected_at: new Date().toISOString() } : p,
    );
    localStore.setShipParts(parts);
    await addXpToAvailableSquad(agent, XP_AMOUNTS.pezzo_navicella, "pezzo_navicella", 3);
    return { data: parts, source: "local" };
  }
}

export function shipProgressPercent(parts: DbSpaceshipPart[]): number {
  if (parts.length === 0) return 0;
  return Math.round((parts.filter((p) => p.collected).length / parts.length) * 100);
}
