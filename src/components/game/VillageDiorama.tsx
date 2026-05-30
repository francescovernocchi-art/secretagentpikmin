import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { VILLAGE_BUILDINGS } from "@/data/secretPikminWorld";
import { hapticTap } from "@/lib/haptic";
import { useVillageDiorama, useSpaceshipParts, usePikminSquad, usePlayerBiome } from "@/hooks/useGameData";
import { shipProgressPercent } from "@/lib/game/spaceship";
import { getBiomeByKey } from "@/data/secretPikminWorld";
import { SpaceshipAssemblyPanel } from "@/components/game/SpaceshipAssemblyPanel";
import { DioramaTerrain } from "@/components/game/diorama/DioramaTerrain";
import { DioramaBuilding } from "@/components/game/diorama/DioramaBuilding";
import { DioramaPikminActor } from "@/components/game/diorama/DioramaPikminActor";
import { DioramaShipHangar } from "@/components/game/diorama/DioramaShipHangar";
import { DIORAMA_BUILDINGS, BIOME_DIORAMA_THEMES } from "@/components/game/diorama/diorama-data";
import styles from "@/styles/village-diorama.module.css";
import type { BiomeKey } from "@/types/secretPikmin";

interface VillageDioramaProps {
  buildingCount?: number;
  pikminCount?: number;
  compact?: boolean;
  ownerAgent?: string;
  showFooter?: boolean;
  fullScreen?: boolean;
}

/** Diorama isometrico 2.5D — vista principale del villaggio */
export function VillageDiorama({
  buildingCount,
  pikminCount = 12,
  compact = false,
  ownerAgent,
  showFooter = true,
  fullScreen = false,
}: VillageDioramaProps) {
  const { buildings, villageName, controlLevel, maxVillages, loading } = useVillageDiorama(ownerAgent);
  const { parts } = useSpaceshipParts();
  const { squad } = usePikminSquad(ownerAgent);
  const { biome } = usePlayerBiome(ownerAgent);
  const shipPct = shipProgressPercent(parts);
  const [shipOpen, setShipOpen] = useState(false);

  const closeShip = useCallback(() => setShipOpen(false), []);

  useEffect(() => {
    if (!shipOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeShip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shipOpen, closeShip]);

  const theme = BIOME_DIORAMA_THEMES[(biome as BiomeKey) ?? "bosco"] ?? BIOME_DIORAMA_THEMES.bosco;
  const biomeDef = getBiomeByKey(biome);

  const levelMap = new Map(buildings.map((b) => [b.building_key, b.level]));
  const statusMap = new Map(buildings.map((b) => [b.building_key, b.status as "active" | "upgrading" | "locked"]));

  const displayBuildings =
    buildings.length > 0
      ? DIORAMA_BUILDINGS.map((def) => ({
          def,
          level: levelMap.get(def.key) ?? 1,
          status: statusMap.get(def.key) ?? "active",
        }))
      : DIORAMA_BUILDINGS.slice(0, (buildingCount ?? 3) + 3).map((def, i) => ({
          def,
          level: VILLAGE_BUILDINGS.find((b) => b.key === def.key)?.level ?? i + 1,
          status: "active" as const,
        }));

  const visiblePikmin = squad.length > 0 ? squad.slice(0, compact ? 3 : 6) : [];
  const onMission = squad.filter((p) => p.status === "in_spedizione" || p.status === "in_missione");
  const hangarDef = DIORAMA_BUILDINGS.find((b) => b.key === "hangar")!;
  const sceneBuildings = displayBuildings.filter((b) => b.def.key !== "hangar");

  return (
    <section className={`${styles.dioramaRoot} ${compact ? styles.compact : ""} ${fullScreen ? "rounded-none border-0 min-h-[50vh]" : ""}`}>
      {!compact && villageName && (
        <div className={styles.dioramaHeader}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-primary/90 font-display">{villageName}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {biomeDef?.emoji} {biomeDef?.label} · CC Lv{controlLevel} · max {maxVillages} villaggi
            </p>
          </div>
          {!fullScreen && (
            <Link to="/villaggio/edifici" onClick={hapticTap} className="text-[9px] uppercase tracking-widest text-primary panel px-2 py-1">
              Edifici →
            </Link>
          )}
        </div>
      )}

      <div className={styles.dioramaScene} role="img" aria-label={`Villaggio ${villageName || ""} nel bioma ${biomeDef?.label ?? biome}`}>
        <DioramaTerrain theme={theme} />

        {sceneBuildings.map(({ def, level, status }) => (
          <DioramaBuilding
            key={def.key}
            def={def}
            level={level}
            status={status}
            compact={compact}
            onShipClick={() => setShipOpen(true)}
          />
        ))}

        <div style={{ position: "absolute", left: `${hangarDef.x}%`, top: `${hangarDef.y}%`, zIndex: hangarDef.z, transform: "translate(-50%, -50%)" }}>
          <DioramaShipHangar
            parts={parts}
            percent={shipPct}
            compact={compact}
            onClick={() => { hapticTap(); setShipOpen(true); }}
          />
        </div>

        {visiblePikmin.map((p, i) => (
          <DioramaPikminActor key={p.id} pikmin={p} index={i} compact={compact} />
        ))}

        {visiblePikmin.length === 0 && !loading && (
          Array.from({ length: compact ? 2 : 4 }).map((_, i) => (
            <motion.div
              key={`placeholder-${i}`}
              className={styles.pikminActor}
              style={{ left: `${35 + i * 12}%`, top: `${55 + (i % 2) * 8}%`, zIndex: 55 + i }}
              animate={{ x: [0, 5, 0], y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 3 + i * 0.4 }}
            >
              <span className="text-2xl opacity-70">🌱</span>
            </motion.div>
          ))
        )}
      </div>

      {showFooter && !compact && (
        <div className="relative px-4 pb-3 flex items-center justify-between gap-2 flex-wrap border-t border-primary/10 bg-black/20">
          <div className="text-[10px] uppercase tracking-widest py-2">
            <span className="text-primary">{squad.length || pikminCount}</span>{" "}
            <span className="text-muted-foreground">Pikmin · {loading ? "…" : `${displayBuildings.length} edifici`}</span>
            {onMission.length > 0 && (
              <span className="block text-[9px] text-amber-300 mt-0.5">{onMission.length} in spedizione</span>
            )}
          </div>
          <div className="flex gap-1">
            {parts.filter((p) => p.collected).slice(0, 5).map((p) => (
              <span key={p.key} className="text-sm drop-shadow-[0_0_4px_rgba(56,189,248,0.6)]" title={p.name}>{p.emoji}</span>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {shipOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-night/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
            onClick={closeShip}
            role="presentation"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="panel-strong w-full max-w-lg p-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ship-hangar-title"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 id="ship-hangar-title" className="font-display text-lg text-glow">Hangar Navicella</h3>
                <button type="button" onClick={closeShip} className="panel p-1.5" aria-label="Chiudi hangar">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SpaceshipAssemblyPanel />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
