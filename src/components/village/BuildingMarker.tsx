import { motion } from "framer-motion";
import { useBuildingImages } from "@/hooks/useBuildingImages";
import { pickBuildingImage } from "@/lib/village/buildingImages";
import { visualFor } from "@/lib/village/buildingVisuals";
import { pctToWorld } from "@/lib/village/mapProjection";
import { ConstructionSite } from "./ConstructionSite";
import { formatRemaining } from "@/lib/base";
import type { BaseBuilding } from "@/lib/base";

interface Props {
  building: BaseBuilding;
  onTap?: (b: BaseBuilding) => void;
  tick: number;
}

/** Render world-coord di un edificio: idle = sprite, building/upgrading = cantiere. */
export function BuildingMarker({ building, onTap, tick }: Props) {
  void tick;
  const p = pctToWorld(building.position_x, building.position_y);
  const v = visualFor(building.type);
  const level = Math.max(1, building.level || 1);
  const isBuilding = building.status !== "idle";
  const imageMap = useBuildingImages();
  const customImage = pickBuildingImage(imageMap.get(building.type), level);

  let progress = 0;
  let remaining: string | undefined;
  if (isBuilding && building.build_end_at && building.started_at) {
    const total = new Date(building.build_end_at).getTime() - new Date(building.started_at).getTime();
    const elapsed = Date.now() - new Date(building.started_at).getTime();
    progress = Math.max(0, Math.min(1, elapsed / total));
    remaining = formatRemaining(building.build_end_at);
  }

  return (
    <motion.button
      type="button"
      onClick={(e) => { e.stopPropagation(); onTap?.(building); }}
      whileTap={{ scale: 0.92 }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center group"
      style={{ left: p.x, top: p.y, filter: "drop-shadow(0 6px 8px rgba(0,0,0,.45))" }}
      aria-label={`${v.nameIt} livello ${level}`}
    >
      {/* ombra */}
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-2 rounded-full bg-black/45 blur-sm" />

      {isBuilding ? (
        <ConstructionSite progress={progress} remainingLabel={remaining} />
      ) : (
        <>
          <motion.span
            className="relative leading-none flex items-center justify-center"
            style={{ width: 72, height: 72, fontSize: 56,
              filter: level >= 3 ? `drop-shadow(0 0 ${level * 2}px ${v.glow})` : undefined }}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 3 + (building.position_x % 3), repeat: Infinity, ease: "easeInOut" }}
          >
            {customImage ? (
              <img src={customImage} alt={v.nameIt}
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false} />
            ) : (
              v.iconEmoji
            )}
          </motion.span>
          <span className="mt-0.5 text-[9px] font-bold px-1.5 rounded-full"
            style={{ background: v.accent, color: "#0a0a1a" }}>
            Lv {level}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-white/90 opacity-0 group-hover:opacity-100 transition mt-0.5 whitespace-nowrap bg-black/50 px-1 rounded">
            {v.nameIt}
          </span>
        </>
      )}
    </motion.button>
  );
}
