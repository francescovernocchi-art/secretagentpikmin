import { useMemo } from "react";
import type { BaseBuilding } from "@/lib/base";
import { BASE_CENTER, pctToWorld, WORLD_W, WORLD_H } from "@/lib/village/mapProjection";

interface Props { buildings: BaseBuilding[]; }

/** Sentieri morbidi dal Campo Base ad ogni edificio costruito. */
export function PathLayer({ buildings }: Props) {
  const lines = useMemo(() => {
    return buildings
      .filter((b) => b.status === "idle")
      .map((b) => {
        const p = pctToWorld(b.position_x, b.position_y);
        const mx = (BASE_CENTER.x + p.x) / 2;
        const my = (BASE_CENTER.y + p.y) / 2 - 30;
        return { id: b.id, d: `M ${BASE_CENTER.x} ${BASE_CENTER.y} Q ${mx} ${my} ${p.x} ${p.y}` };
      });
  }, [buildings]);

  if (!lines.length) return null;
  return (
    <svg
      width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      className="absolute inset-0 pointer-events-none" aria-hidden
    >
      {lines.map((l) => (
        <path
          key={l.id} d={l.d}
          stroke="#c8a96b" strokeOpacity={0.55} strokeWidth={14}
          strokeLinecap="round" fill="none"
          strokeDasharray="2 18"
        />
      ))}
    </svg>
  );
}
