import type { BaseBuilding } from "@/lib/base";
import type { PikminType } from "@/data/pikminSprites";
import { VillagePikminLayer } from "@/components/pikmin/VillagePikminLayer";

interface Props {
  buildings: BaseBuilding[];
  pikminCount: number;
  threat?: boolean;
  breakdown?: Partial<Record<PikminType, number>>;
}

/** Wrapper layer Pikmin: si stende su tutto il world container. */
export function PikminLayer(props: Props) {
  return <VillagePikminLayer {...props} />;
}
