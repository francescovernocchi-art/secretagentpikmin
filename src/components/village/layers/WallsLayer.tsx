import { WallLayer } from "../WallLayer";
import type { WallSegment } from "@/lib/village/walls";

interface Props { walls: WallSegment[]; }

/** Wrapper layer mura — usa il rendering SVG esistente in coordinate 0..100. */
export function WallsLayer({ walls }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <WallLayer walls={walls} />
    </div>
  );
}
