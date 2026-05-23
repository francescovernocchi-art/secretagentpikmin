import { motion } from "framer-motion";
import { WallSegment, WALL_MATERIALS } from "@/lib/village/walls";

interface Props {
  walls: WallSegment[];
  onClickWall?: (w: WallSegment) => void;
}

/** Overlay SVG: rende i muri sulla scena del villaggio.
 *  Coordinate: position_x in 0..100 (sx→dx), position_y in 0..100 (basso→alto).
 *  Convertiamo y in 100-y per SVG (origine in alto). */
export function WallLayer({ walls, onClickWall }: Props) {
  if (walls.length === 0) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full pointer-events-none"
    >
      {walls.map((w) => {
        const mat = WALL_MATERIALS[w.material] ?? WALL_MATERIALS.wood;
        const thickness = 0.6 + w.level * 0.35;
        return (
          <g key={w.id}>
            <motion.line
              x1={w.from_x}
              y1={100 - w.from_y}
              x2={w.to_x}
              y2={100 - w.to_y}
              stroke={mat.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.95 }}
              transition={{ duration: 0.6 }}
              style={{
                filter: `drop-shadow(0 0 1.5px ${mat.color}aa)`,
                pointerEvents: onClickWall ? "auto" : "none",
                cursor: onClickWall ? "pointer" : undefined,
              }}
              onClick={() => onClickWall?.(w)}
            />
            {/* picchetti */}
            <circle cx={w.from_x} cy={100 - w.from_y} r={thickness * 0.8} fill={mat.color} opacity={0.9} />
            <circle cx={w.to_x} cy={100 - w.to_y} r={thickness * 0.8} fill={mat.color} opacity={0.9} />
          </g>
        );
      })}
    </svg>
  );
}
