import { BIOMES } from "@/data/secretPikminWorld";
import { agentKeyFromSession, gameTable, safeGameQuery } from "@/lib/game/db";
import { addInventoryItem } from "@/lib/game/inventory";
import { fetchPlayerLocation } from "@/lib/game/player-location";
import { localStore } from "@/lib/game/local-store";
import { addPikminUnit } from "@/lib/game/pikmin-units";
import { collectSpaceshipPart } from "@/lib/game/spaceship";
import { recordMonsterEncounter } from "@/lib/game/bestiary";
import { addXpToAvailableSquad, XP_AMOUNTS } from "@/lib/game/pikmin-xp";
import { generateBiomeDiscovery } from "@/lib/game/scanner-weights";
import type { DbScanResult, ScanDiscovery } from "@/types/phase2-db";
import type { BiomeKey } from "@/types/secretPikmin";
import { getSession } from "@/lib/session";
import { SHIP_PARTS } from "@/data/secretPikminWorld";
import { emitScanDiscoveryFx } from "@/lib/game-event-fx";

export { generateBiomeDiscovery } from "@/lib/game/scanner-weights";

const PIKMIN_TYPE_MAP: Record<string, string> = {
  red: "rosso",
  yellow: "giallo",
  blue: "blu",
  purple: "viola",
  white: "bianco",
  rock: "roccia",
  wing: "alato",
  ice: "ghiaccio",
  glow: "luminoso",
};

export async function fetchCurrentBiome(agentKey?: string): Promise<{ biome: BiomeKey; source: "supabase" | "local" }> {
  const agent = agentKey ?? agentKeyFromSession(getSession()?.role);
  const loc = await fetchPlayerLocation(agent);
  return { biome: loc.current_biome as BiomeKey, source: "local" };
}

export async function processScanDiscovery(
  discovery: ScanDiscovery,
  biomeKey: BiomeKey,
  agentKey?: string,
): Promise<{ scan: DbScanResult; effects: string[] }> {
  const agent = agentKey ?? agentKeyFromSession(getSession()?.role);
  const effects: string[] = [];

  const scanRow: DbScanResult = {
    id: crypto.randomUUID(),
    agent_key: agent,
    biome_key: biomeKey,
    target_type: discovery.targetType,
    label: discovery.label,
    emoji: discovery.emoji,
    payload: discovery.payload,
    created_at: new Date().toISOString(),
  };

  try {
    await gameTable("scan_results").insert({
      agent_key: scanRow.agent_key,
      biome_key: scanRow.biome_key,
      target_type: scanRow.target_type,
      label: scanRow.label,
      emoji: scanRow.emoji,
      payload: scanRow.payload,
    });
  } catch {
    localStore.addScan(scanRow);
  }

  await addXpToAvailableSquad(agent, XP_AMOUNTS.scan, "scan", 3);

  switch (discovery.targetType) {
    case "pikmin_selvatico": {
      const rawType = (discovery.payload.type_key as string) ?? "rosso";
      const typeKey = PIKMIN_TYPE_MAP[rawType] ?? rawType;
      await addPikminUnit({
        ownerAgent: agent,
        name: discovery.label.split(" ").slice(-2).join(" ") || "Nuovo Pikmin",
        typeKey,
        preferredBiome: biomeKey,
      });
      await addXpToAvailableSquad(agent, XP_AMOUNTS.pikmin_selvatico, "pikmin_selvatico", 2);
      effects.push("Pikmin aggiunto alla squadra");
      break;
    }
    case "mostro": {
      const creatureKey = (discovery.payload.creature_key as string) ?? "unknown";
      const { statusLabel, weaknessUnlocked } = await recordMonsterEncounter({
        creatureKey,
        name: discovery.label,
        emoji: discovery.emoji,
        biomeKey,
        discoveredBy: agent,
        source: "scan",
      });
      effects.push(`Bestiario: ${statusLabel}${weaknessUnlocked ? " — debolezza sbloccata" : ""}`);
      break;
    }
    case "pezzo_navicella": {
      const partKey = discovery.payload.part_key as string;
      if (partKey) {
        await collectSpaceshipPart(partKey, agent);
        await addXpToAvailableSquad(agent, XP_AMOUNTS.pezzo_navicella, "pezzo_navicella", 3);
        effects.push("Pezzo navicella recuperato");
      }
      break;
    }
    default: {
      const category = (discovery.payload.category as "oggetto" | "materiale" | "ingrediente") ?? "oggetto";
      const itemKey = (discovery.payload.item_key as string) ?? discovery.label.replace(/\s+/g, "_").toLowerCase();
      await addInventoryItem({
        agentKey: agent,
        itemKey,
        itemName: discovery.label,
        emoji: discovery.emoji,
        category,
        sellPrice: (discovery.payload.sell_price as number) ?? 20,
      });
      await addXpToAvailableSquad(agent, XP_AMOUNTS.raccolta, "raccolta", 2);
      effects.push("Aggiunto all'inventario");
    }
  }

  emitScanDiscoveryFx(discovery);
  return { scan: scanRow, effects };
}

/** Legacy EnergyScanner catch — maps color type to biome-aware flow */
export async function processEnergyScannerCatch(type: string): Promise<{ discovery: ScanDiscovery; effects: string[] }> {
  const { biome } = await fetchCurrentBiome();
  const discovery: ScanDiscovery = {
    targetType: "pikmin_selvatico",
    label: `Pikmin ${type}`,
    emoji: "🌱",
    payload: { type_key: PIKMIN_TYPE_MAP[type] ?? type },
  };
  const { effects } = await processScanDiscovery(discovery, biome);
  return { discovery, effects };
}

export async function runWeightedAreaScan(agentKey?: string): Promise<{
  discovery: ScanDiscovery;
  scan: DbScanResult;
  effects: string[];
  biome: BiomeKey;
}> {
  const agent = agentKey ?? agentKeyFromSession(getSession()?.role);
  const { biome } = await fetchCurrentBiome(agent);
  const squad = localStore.getPikminUnits(agent).filter((u) => u.status === "disponibile").slice(0, 3);
  const discovery = generateBiomeDiscovery(biome, squad);
  const { scan, effects } = await processScanDiscovery(discovery, biome, agent);
  return { discovery, scan, effects, biome };
}

export async function fetchRecentScans(limit = 10): Promise<{ data: DbScanResult[]; source: "supabase" | "local" }> {
  return safeGameQuery(
    () => gameTable("scan_results").select("*").order("created_at", { ascending: false }).limit(limit),
    () => localStore.getScans(limit),
  );
}

export async function fetchBiomeZones() {
  return safeGameQuery(
    () => gameTable("biome_zones").select("*").order("key"),
    () =>
      BIOMES.map((b) => ({
        key: b.key,
        label: b.label,
        emoji: b.emoji,
        theme: b.theme,
        resources: b.resources,
        ingredients: b.ingredients,
        frequent_pikmin: b.frequentPikmin,
        frequent_monsters: b.frequentMonsters,
        events: b.events,
        rarity: b.rarity,
        bonus: b.bonus,
        malus: b.malus,
      })),
  );
}

export function getNextShipHint(): { partName: string; hint: string } | null {
  const parts = localStore.getShipParts();
  const missing = parts.filter((p) => !p.collected);
  if (!missing.length) return null;
  const next = missing.sort((a, b) => a.sort_order - b.sort_order)[0];
  const fallback = SHIP_PARTS.find((p) => p.key === next.key);
  return { partName: next.name, hint: next.location_hint ?? fallback?.locationHint ?? "Esplora biomi vicini" };
}

export { setManualBiome } from "@/lib/game/player-location";

export function getLastCollectedShipPart() {
  const parts = localStore.getShipParts().filter((p) => p.collected && p.collected_at);
  if (!parts.length) return null;
  const last = parts.sort((a, b) => (b.collected_at ?? "").localeCompare(a.collected_at ?? ""))[0];
  return last;
}
