import type { BaseBuilding } from "@/lib/base";
import { BuildingMarker } from "../BuildingMarker";

interface Props {
  buildings: BaseBuilding[];
  onSelect?: (b: BaseBuilding) => void;
  tick: number;
}

/** Renderizza solo edifici visibili: available e locked non sono in scena. */
export function BuildingsLayer({ buildings, onSelect, tick }: Props) {
  const visible = buildings.filter(
    (b) => b.status === "idle" || b.status === "building" || b.status === "upgrading",
  );
  return (
    <div className="absolute inset-0">
      {visible.map((b) => (
        <BuildingMarker key={b.id} building={b} onTap={onSelect} tick={tick} />
      ))}
    </div>
  );
}
