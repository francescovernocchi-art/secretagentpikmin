import { motion } from "framer-motion";
import { visualFor, spriteFor, evolutionStageLabel } from "@/lib/village/buildingVisuals";
import type { BaseBuilding } from "@/lib/base";

interface Props {
  building: BaseBuilding;
  onTap?: (b: BaseBuilding) => void;
  /** Progress 0..1 if status !== idle. */
  progress?: number;
}

/** Sprite isometrico per un edificio. Cambia visualmente per livello (1→5). */
export function BuildingSprite({ building, onTap, progress }: Props) {
  const v = visualFor(building.type);
  const level = Math.max(1, building.level || 1);
  const sprite = spriteFor(building.type, level);
  const isBuilding = building.status !== "idle";
  const stage = evolutionStageLabel(level);

  // posizione: position_x = 0..100 left%; position_y = 0..100 bottom% (mantenuto dall'esistente)
  return (
    <motion.button
      type="button"
      onClick={() => onTap?.(building)}
      whileTap={{ scale: 0.9 }}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 8, scale: 0.85 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute -translate-x-1/2 flex flex-col items-center group"
      style={{
        left: `${building.position_x}%`,
        bottom: `${building.position_y * 0.55}%`,
        filter: `drop-shadow(0 4px 6px rgba(0,0,0,.5))`,
      }}
      aria-label={`${v.nameIt} livello ${level}`}
    >
      {/* base shadow disc (isometric) */}
      <span
        className="absolute -bottom-1 h-2 rounded-full bg-black/40 blur-sm"
        style={{ width: `${v.size * 1.2}vw`, maxWidth: 56 }}
      />
      {/* idle pulse for legendary */}
      {level >= 5 && (
        <motion.span
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          style={{ background: `radial-gradient(circle, ${v.glow}99, transparent 70%)` }}
        />
      )}

      <motion.span
        className="relative leading-none select-none"
        style={{
          fontSize: `min(56px, ${v.size * 1.4}vw)`,
          filter: level >= 3 ? `drop-shadow(0 0 ${level * 2}px ${v.glow})` : undefined,
        }}
        animate={isBuilding ? { rotate: [-2, 2, -2] } : { y: [0, -1.5, 0] }}
        transition={{ duration: isBuilding ? 0.6 : 3 + (building.position_x % 3), repeat: Infinity, ease: "easeInOut" }}
      >
        {sprite}
      </motion.span>

      {/* level badge */}
      <span
        className="mt-0.5 text-[8px] font-bold px-1 rounded-full leading-tight"
        style={{ background: v.accent, color: "#0a0a1a" }}
      >
        Lv {level}
      </span>
      <span className="text-[8px] uppercase tracking-wider text-white/80 opacity-0 group-hover:opacity-100 transition mt-0.5 whitespace-nowrap">
        {v.nameIt} · {stage}
      </span>

      {/* construction progress bar */}
      {isBuilding && progress !== undefined && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-black/60 overflow-hidden">
          <span
            className="block h-full bg-amber-400"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </span>
      )}
    </motion.button>
  );
}
