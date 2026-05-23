import { FACTIONS, FactionKey } from "./factions";
import type { BaseBuilding, BuildingCatalog } from "@/lib/base";

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

  for (const b of buildings) {
    if (b.status !== "idle" && b.level === 0) continue; // ancora in costruzione iniziale
    const c = catalog.find((x) => x.key === b.type);
    if (!c) continue;
    const lvl = Math.max(1, b.level);
    const bonus = c.bonus_per_level ?? {};
    if (bonus.energy_max) energyMax += bonus.energy_max * lvl;
    if (bonus.defense) defenseRating += bonus.defense * lvl;
    if (bonus.pikmin_per_hour) {
      const mult = cfg?.bonuses.pikminGrowthMult ?? 1;
      pikminPerHour += bonus.pikmin_per_hour * lvl * mult;
    }
    if (bonus.scan_range) scanRange += bonus.scan_range * lvl;
    if (bonus.storage) storageBonus += bonus.storage * lvl;
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
  };
}
