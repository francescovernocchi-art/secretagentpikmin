import { PikminLife } from "./PikminLife";
import type { FactionKey } from "@/lib/village/factions";
import type { BaseBuilding } from "@/lib/base";
import type { DayPhase } from "@/lib/daycycle";
import type { VillageCosmetics } from "@/lib/village/cosmetics";

interface Props {
  faction: FactionKey;
  buildings: BaseBuilding[];
  threat: boolean;
  phase: DayPhase;
  cosmetics: VillageCosmetics;
  count?: number;
}

/** Pikmin che vivono nel villaggio: pattuglie, lavoratori, esploratori. */
export function PikminAmbientLayer({ faction, buildings, threat, phase, cosmetics, count }: Props) {
  return (
    <PikminLife
      count={count ?? Math.min(18, 6 + buildings.length * 2)}
      faction={faction}
      buildings={buildings.map((b) => ({
        position_x: b.position_x,
        position_y: b.position_y,
        type: b.type,
      }))}
      threat={threat}
      phase={phase}
      skin={{
        body: cosmetics.pikminBody,
        accessory: cosmetics.pikminAccessory,
        aura: cosmetics.pikminAura,
        accent: cosmetics.accentColor,
      }}
    />
  );
}
