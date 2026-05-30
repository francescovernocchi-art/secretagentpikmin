import { BIOMES, SHIP_PARTS } from "@/data/secretPikminWorld";
import { localStore } from "@/lib/game/local-store";
import type { DbPikminUnit, ScanDiscovery } from "@/types/phase2-db";
import type { BiomeKey, PikminSpecializationKey } from "@/types/secretPikmin";

export interface ScannerContext {
  biomeKey: BiomeKey;
  squad?: DbPikminUnit[];
}

type WeightRow = { type: string; base: number };

const BASE_WEIGHTS: WeightRow[] = [
  { type: "ingrediente", base: 28 },
  { type: "materiale", base: 22 },
  { type: "oggetto_raro", base: 10 },
  { type: "mostro", base: 18 },
  { type: "pikmin_selvatico", base: 14 },
  { type: "pezzo_navicella", base: 5 },
  { type: "anomalia", base: 3 },
];

const BIOME_MODIFIERS: Partial<Record<BiomeKey, Partial<Record<string, number>>>> = {
  industriale: { materiale: 1.8, pezzo_navicella: 1.6, ingrediente: 0.7 },
  deserto: { ingrediente: 1.4, mostro: 1.3, materiale: 1.2 },
  palude: { mostro: 1.5, pikmin_selvatico: 1.2, ingrediente: 1.1 },
  ghiaccio: { materiale: 1.3, mostro: 1.2, pezzo_navicella: 1.2 },
  giardino: { ingrediente: 1.6, pikmin_selvatico: 1.4, mostro: 0.8 },
  bosco: { ingrediente: 1.3, pikmin_selvatico: 1.3, mostro: 1.1 },
  caverna: { oggetto_raro: 1.5, pezzo_navicella: 1.4, mostro: 1.3 },
  vulcano: { materiale: 1.5, mostro: 1.4, anomalia: 1.5 },
};

const SPEC_BONUS: Partial<Record<PikminSpecializationKey, Partial<Record<string, number>>>> = {
  ricerca: { pezzo_navicella: 1.8, oggetto_raro: 1.4, anomalia: 1.3 },
  scouting: { pikmin_selvatico: 1.5, mostro: 1.2 },
  raccolta: { ingrediente: 1.7, materiale: 1.2 },
  spionaggio: { mostro: 1.6, oggetto_raro: 1.3 },
  combattimento: { mostro: 1.5 },
  trasporto: { materiale: 1.4, pezzo_navicella: 1.2 },
  supporto: { pikmin_selvatico: 1.3, ingrediente: 1.2 },
};

function pickWeighted(types: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < types.length; i++) {
    r -= weights[i];
    if (r <= 0) return types[i];
  }
  return types[types.length - 1];
}

function avgLevel(squad: DbPikminUnit[]): number {
  if (!squad.length) return 1;
  return squad.reduce((a, p) => a + p.level, 0) / squad.length;
}

function computeWeights(ctx: ScannerContext): { types: string[]; weights: number[] } {
  const types = BASE_WEIGHTS.map((r) => r.type);
  const level = avgLevel(ctx.squad ?? []);
  const levelMult = 1 + (level - 1) * 0.04;
  const biomeMod = BIOME_MODIFIERS[ctx.biomeKey] ?? {};

  const weights = BASE_WEIGHTS.map((row) => {
    let w = row.base;
    w *= biomeMod[row.type] ?? 1;
    for (const p of ctx.squad ?? []) {
      const spec = p.specialization_key as PikminSpecializationKey | null;
      if (spec && SPEC_BONUS[spec]?.[row.type]) {
        w *= SPEC_BONUS[spec]![row.type]!;
      }
    }
    if (row.type === "pezzo_navicella" || row.type === "oggetto_raro") w *= levelMult;
    if (row.type === "mostro" && level >= 5) w *= 1.15;
    return Math.max(0.5, w);
  });

  const parts = localStore.getShipParts();
  const missingParts = parts.filter((p) => !p.collected).length;
  if (missingParts <= 2) {
    const idx = types.indexOf("pezzo_navicella");
    if (idx >= 0) weights[idx] *= 1.5;
  }

  return { types, weights };
}

export function generateWeightedDiscovery(ctx: ScannerContext): ScanDiscovery {
  const biome = BIOMES.find((b) => b.key === ctx.biomeKey) ?? BIOMES[0];
  const { types, weights } = computeWeights(ctx);
  const targetType = pickWeighted(types, weights);

  switch (targetType) {
    case "pikmin_selvatico": {
      const pk = biome.frequentPikmin[Math.floor(Math.random() * biome.frequentPikmin.length)] ?? "rosso";
      return { targetType, label: `Pikmin ${pk} selvatico`, emoji: "🌱", payload: { type_key: pk, rarity: biome.rarity } };
    }
    case "mostro": {
      const name = biome.frequentMonsters[Math.floor(Math.random() * biome.frequentMonsters.length)] ?? "Creatura";
      const key = name.toLowerCase().replace(/\s+/g, "_");
      const rarity = biome.rarity === "raro" ? "raro" : biome.rarity === "epico" ? "epico" : "comune";
      const squadLevel = avgLevel(ctx.squad ?? []);
      return { targetType, label: name, emoji: "👾", payload: { creature_key: key, rarity, danger: Math.min(5, 1 + Math.floor(squadLevel / 3)) } };
    }
    case "pezzo_navicella": {
      const localParts = localStore.getShipParts();
      const missing = localParts.filter((p) => !p.collected);
      const fallback = SHIP_PARTS.filter((p) => !p.collected);
      const pool = missing.length ? missing : fallback.length ? fallback : SHIP_PARTS;
      const part = pool[Math.floor(Math.random() * pool.length)];
      return { targetType, label: part.name, emoji: part.emoji, payload: { part_key: part.key } };
    }
    case "anomalia":
      return { targetType, label: `Anomalia ${biome.label}`, emoji: "⚡", payload: { biome: ctx.biomeKey } };
    case "materiale": {
      const mat = biome.resources[Math.floor(Math.random() * biome.resources.length)] ?? "rottame";
      return {
        targetType,
        label: mat,
        emoji: mat.toLowerCase().includes("cristall") ? "💎" : mat.toLowerCase().includes("batter") ? "🔋" : "📦",
        payload: { item_key: mat.replace(/\s+/g, "_").toLowerCase(), category: "materiale", sell_price: 40 },
      };
    }
    case "oggetto_raro":
      return {
        targetType,
        label: `Reliquia ${biome.label}`,
        emoji: "✨",
        payload: { item_key: `reliquia_${ctx.biomeKey}`, category: "oggetto", sell_price: 80 + Math.floor(avgLevel(ctx.squad ?? []) * 5) },
      };
    default: {
      const ing = biome.ingredients[Math.floor(Math.random() * biome.ingredients.length)] ?? "frutto";
      return {
        targetType: "ingrediente",
        label: ing,
        emoji: "🍯",
        payload: { item_key: ing.replace(/\s+/g, "_").toLowerCase(), category: "ingrediente", sell_price: 25 },
      };
    }
  }
}

/** Backward-compatible wrapper */
export function generateBiomeDiscovery(biomeKey: BiomeKey, squad?: DbPikminUnit[]): ScanDiscovery {
  return generateWeightedDiscovery({ biomeKey, squad });
}
