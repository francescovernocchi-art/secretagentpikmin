import { BASE_CENTER, WORLD_W, WORLD_H } from "@/lib/village/mapProjection";

interface Props {
  baseLevel: number;
  /** Raggio difesa in unità mondo (px). */
  defenseRadiusPx?: number;
  baseName: string;
}

/** Marker Campo Base + raggio difesa. */
export function HudLayer({ baseLevel, defenseRadiusPx = 320, baseName }: Props) {
  return (
    <svg
      width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      className="absolute inset-0 pointer-events-none" aria-hidden
    >
      <circle cx={BASE_CENTER.x} cy={BASE_CENTER.y} r={defenseRadiusPx}
        fill="none" stroke="#9be8a4" strokeOpacity={0.35} strokeWidth={3} strokeDasharray="10 8" />
      <circle cx={BASE_CENTER.x} cy={BASE_CENTER.y} r={14} fill="#fde68a" stroke="#a16207" strokeWidth={2} />
      <text x={BASE_CENTER.x} y={BASE_CENTER.y - 22} textAnchor="middle"
        fontSize={16} fontWeight={700} fill="#fde68a" stroke="#000" strokeWidth={0.5}>
        🚩 {baseName} · Lv {baseLevel}
      </text>
    </svg>
  );
}
