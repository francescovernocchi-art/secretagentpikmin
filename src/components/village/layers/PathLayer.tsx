import { useMemo } from "react";
import type { BaseBuilding } from "@/lib/base";
import { BASE_CENTER, pctToWorld, WORLD_W, WORLD_H } from "@/lib/village/mapProjection";

interface Props { buildings: BaseBuilding[]; }

/** Sentieri morbidi color sabbia dal Campo Base ad ogni edificio costruito. */
export function PathLayer({ buildings }: Props) {
  const lines = useMemo(() => {
    return buildings
      .filter((b) => b.status === "idle")
      .map((b) => {
        const p = pctToWorld(b.position_x, b.position_y);
        const mx = (BASE_CENTER.x + p.x) / 2 + ((b.id.charCodeAt(0) % 40) - 20);
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
        <g key={l.id}>
          {/* bordo terra scura */}
          <path d={l.d} stroke="#7a5a30" strokeOpacity={0.45} strokeWidth={22}
            strokeLinecap="round" fill="none" />
          {/* sabbia chiara sopra */}
          <path d={l.d} stroke="#e9d3a0" strokeOpacity={0.85} strokeWidth={16}
            strokeLinecap="round" fill="none" />
          {/* impronte leggere */}
          <path d={l.d} stroke="#8a6a3a" strokeOpacity={0.35} strokeWidth={3}
            strokeLinecap="round" fill="none" strokeDasharray="1 22" />
        </g>
      ))}
    </svg>
  );
}
