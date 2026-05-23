import { motion } from "framer-motion";
import type { BaseBuilding } from "@/lib/base";

interface Props {
  buildings: BaseBuilding[];
  /** Tipi che mostrano un cerchio di copertura difensiva. */
  rangeByType?: Record<string, number>;
}

const DEFAULT_RANGE: Record<string, number> = {
  defense_tower: 22,
  radar_station: 35,
};

/** Cerchi di copertura attorno alle torri difensive / radar. */
export function DefenseRangeLayer({ buildings, rangeByType = DEFAULT_RANGE }: Props) {
  const towers = buildings.filter((b) => rangeByType[b.type] && b.status === "idle" && b.level > 0);
  if (towers.length === 0) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full pointer-events-none"
    >
      {towers.map((b) => {
        const baseR = rangeByType[b.type];
        const r = baseR + b.level * 2;
        const color = b.type === "radar_station" ? "#7dd3fc" : "#fb923c";
        return (
          <motion.circle
            key={b.id}
            cx={b.position_x}
            cy={100 - b.position_y}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={0.3}
            strokeDasharray="1.5 1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ filter: `drop-shadow(0 0 2px ${color}aa)` }}
          />
        );
      })}
    </svg>
  );
}
