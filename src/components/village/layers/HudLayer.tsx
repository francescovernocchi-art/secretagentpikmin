import { BASE_CENTER, WORLD_W, WORLD_H } from "@/lib/village/mapProjection";

interface Props {
  baseLevel: number;
  /** Raggio difesa in unità mondo (px). */
  defenseRadiusPx?: number;
  baseName: string;
}

/**
 * Marker Campo Base + raggio difesa. Solo elementi mondo (zoomabili).
 * Il nome+livello vivono nel FixedHud fuori dal viewport zoomato.
 */
export function HudLayer({ defenseRadiusPx = 320 }: Props) {
  return (
    <svg
      width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      className="absolute inset-0 pointer-events-none" aria-hidden
    >
      {/* raggio difesa */}
      <circle cx={BASE_CENTER.x} cy={BASE_CENTER.y} r={defenseRadiusPx}
        fill="none" stroke="#9be8a4" strokeOpacity={0.28} strokeWidth={3} strokeDasharray="10 8" />
      {/* piazza centrale */}
      <circle cx={BASE_CENTER.x} cy={BASE_CENTER.y} r={42} fill="#d9b673" opacity={0.55} />
      <circle cx={BASE_CENTER.x} cy={BASE_CENTER.y} r={42} fill="none" stroke="#8a6a3a" strokeOpacity={0.45} strokeWidth={2} />
      {/* asta bandiera */}
      <rect x={BASE_CENTER.x - 1.5} y={BASE_CENTER.y - 38} width={3} height={42} fill="#5a3a1a" />
      <path d={`M ${BASE_CENTER.x + 1.5} ${BASE_CENTER.y - 38} L ${BASE_CENTER.x + 22} ${BASE_CENTER.y - 32} L ${BASE_CENTER.x + 1.5} ${BASE_CENTER.y - 24} Z`}
        fill="#ef476f" stroke="#7a1f33" strokeWidth={1} />
    </svg>
  );
}
