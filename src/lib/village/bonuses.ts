import { FACTIONS, FactionKey } from "./factions";
import type { BaseBuilding, BuildingCatalog } from "@/lib/base";

export type BonusKey = "energy_max" | "defense" | "pikmin_per_hour" | "scan_range" | "storage";

export interface BonusSource {
  bonus: BonusKey;
  amount: number;
  buildingKey: string;
  buildingName: string;
  level: number;
}

export interface VillageStatus {
  faction: FactionKey | null;
  energyMax: number;
  defenseRating: number;
  pikminPerHour: number;
  scanRange: number;
  storageBonus: number;
  threatLevel: "calmo" | "vigilanza" | "allarme";
  buildingsTotal: number;
  buildingsLevelSum: number;
  /** Lista delle origini bonus (per il pannello "Bonus"). */
  sources: BonusSource[];
}

export function computeVillageStatus(
  faction: FactionKey | null,
  buildings: BaseBuilding[],
  catalog: BuildingCatalog[],
): VillageStatus {
  const cfg = faction ? FACTIONS[faction] : null;
  let energyMax = 100 + (cfg?.bonuses.energyMaxBonus ?? 0);
  let defenseRating = cfg?.bonuses.defenseBonus ?? 0;
  let pikminPerHour = 0;
  let scanRange = 100;
  let storageBonus = 0;
  const sources: BonusSource[] = [];

  for (const b of buildings) {
    if (b.status !== "idle" && b.level === 0) continue;
    const c = catalog.find((x) => x.key === b.type);
    if (!c) continue;
    const lvl = Math.max(1, b.level);
    const bonus = c.bonus_per_level ?? {};
    const push = (key: BonusKey, amount: number) => {
      if (amount) sources.push({ bonus: key, amount, buildingKey: c.key, buildingName: c.name, level: lvl });
    };
    if (bonus.energy_max) { energyMax += bonus.energy_max * lvl; push("energy_max", bonus.energy_max * lvl); }
    if (bonus.defense)    { defenseRating += bonus.defense * lvl; push("defense", bonus.defense * lvl); }
    if (bonus.pikmin_per_hour) {
      const mult = cfg?.bonuses.pikminGrowthMult ?? 1;
      const amt = bonus.pikmin_per_hour * lvl * mult;
      pikminPerHour += amt; push("pikmin_per_hour", amt);
    }
    if (bonus.scan_range) { scanRange += bonus.scan_range * lvl; push("scan_range", bonus.scan_range * lvl); }
    if (bonus.storage)    { storageBonus += bonus.storage * lvl; push("storage", bonus.storage * lvl); }
  }

  const buildingsLevelSum = buildings.reduce((a, b) => a + b.level, 0);
  const threatLevel: VillageStatus["threatLevel"] =
    defenseRating >= 60 ? "calmo" : defenseRating >= 25 ? "vigilanza" : "allarme";

  return {
    faction,
    energyMax: Math.round(energyMax),
    defenseRating: Math.round(defenseRating),
    pikminPerHour: Math.round(pikminPerHour * 10) / 10,
    scanRange,
    storageBonus,
    threatLevel,
    buildingsTotal: buildings.length,
    buildingsLevelSum,
    sources,
  };
}

export const BONUS_LABEL: Record<BonusKey, string> = {
  energy_max: "Energia max",
  defense: "Difesa",
  pikmin_per_hour: "Pikmin / ora",
  scan_range: "Raggio scan",
  storage: "Capienza",
};

export const BONUS_ICON: Record<BonusKey, string> = {
  energy_max: "⚡",
  defense: "🛡️",
  pikmin_per_hour: "🌱",
  scan_range: "📡",
  storage: "📦",
};
