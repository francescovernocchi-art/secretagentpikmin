import { useRef, useState } from "react";
import type { BaseBuilding, BaseRow } from "@/lib/base";
import type { WallSegment } from "@/lib/village/walls";
import type { DayPhase } from "@/lib/daycycle";
import type { FactionKey } from "@/lib/village/factions";
import type { PikminType } from "@/data/pikminSprites";
import { resolveBiome, type BiomeKey } from "@/lib/village/biomes";
import { WORLD_W, WORLD_H, BASE_CENTER, pctToWorld } from "@/lib/village/mapProjection";
import { useIsMobile } from "@/hooks/use-mobile";
import { VillageMapViewport, type ViewportHandle } from "./VillageMapViewport";
import { VillageMapControls } from "./VillageMapControls";
import { TerrainLayer } from "./layers/TerrainLayer";
import { PathLayer } from "./layers/PathLayer";
import { FieldsLayer } from "./layers/FieldsLayer";
import { BuildingsLayer } from "./layers/BuildingsLayer";
import { WallsLayer } from "./layers/WallsLayer";
import { ObjectsLayer } from "./layers/ObjectsLayer";
import { PikminLayer } from "./layers/PikminLayer";
import { MonsterThreatLayer } from "./layers/MonsterThreatLayer";
import { EffectsLayer } from "./layers/EffectsLayer";
import { HudLayer } from "./layers/HudLayer";
import type { NearbyThreat } from "./ThreatAlertPanel";

interface Props {
  agent: string;
  base: BaseRow;
  buildings: BaseBuilding[];
  walls: WallSegment[];
  phase: DayPhase;
  pikminCount: number;
  breakdown?: Partial<Record<PikminType, number>>;
  threats: NearbyThreat[];
  tick: number;
  onSelectBuilding?: (b: BaseBuilding) => void;
}

/**
 * Architettura:
 *   VillageMap (root)
 *    ├── MapViewport      ← UNICO elemento che si zooma/panna (terreno, edifici, pikmin, effetti…)
 *    ├── FixedHudLayer    ← nome base, livello, badge — FISSO, non si zooma
 *    └── FloatingControls ← zoom/centra/reset — FISSO, mobile-first
 */
export function VillageMap({
  agent, base, buildings, walls, phase, pikminCount, breakdown, threats, tick, onSelectBuilding,
}: Props) {
  const biomeKey = (resolveBiome(base.theme).key) as BiomeKey;
  const viewportRef = useRef<ViewportHandle>(null);
  const [scale, setScale] = useState(0.8);
  const isMobile = useIsMobile();
  const mapHeight = isMobile ? 560 : 620;

  return (
    <div className="relative">
      {/* ─────────── MAP VIEWPORT (solo scena di gioco si zooma) ─────────── */}
      <VillageMapViewport
        ref={viewportRef}
        worldWidth={WORLD_W}
        worldHeight={WORLD_H}
        height={mapHeight}
        onScaleChange={setScale}
      >
        <TerrainLayer seed={agent} biome={biomeKey} />
        <PathLayer buildings={buildings} />
        <FieldsLayer buildings={buildings} />
        <WallsLayer walls={walls} />
        <ObjectsLayer biome={biomeKey} seed={agent} />
        <BuildingsLayer buildings={buildings} onSelect={onSelectBuilding} tick={tick} />
        <div className="absolute inset-0">
          <PikminLayer
            buildings={buildings}
            pikminCount={pikminCount}
            breakdown={breakdown}
            threat={threats.length > 0}
          />
        </div>
        <MonsterThreatLayer threats={threats} />
        <EffectsLayer phase={phase} faction={(base.faction as FactionKey) ?? "esploratori"} />
        <HudLayer baseLevel={base.level} baseName={base.base_name ?? base.name} />

        {buildings.length === 0 && (
          <div
            className="absolute panel-strong px-4 py-3 text-center"
            style={{ left: BASE_CENTER.x - 140, top: BASE_CENTER.y + 60, width: 280 }}
          >
            <p className="text-xs font-display text-glow">Il tuo villaggio è vuoto</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tocca <b className="text-primary">Costruisci</b> per iniziare dal Centro Comando.
            </p>
          </div>
        )}
      </VillageMapViewport>

      {/* ─────────── FIXED HUD (sopra il viewport, non zoomato) ─────────── */}
      <div className="absolute top-2 left-2 z-30 pointer-events-none">
        <div className="panel-strong px-3 py-1.5 backdrop-blur-md shadow-lg flex items-center gap-2">
          <span className="text-base">🚩</span>
          <div className="leading-tight">
            <p className="text-[11px] font-display text-glow truncate max-w-[160px]">
              {base.base_name ?? base.name}
            </p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Lv {base.level} · {buildings.filter((b) => b.status === "idle").length} strutture
            </p>
          </div>
        </div>
      </div>

      {/* ─────────── FLOATING CONTROLS (fissi, touch-friendly) ─────────── */}
      <VillageMapControls
        scale={scale}
        onZoomIn={() => viewportRef.current?.zoomIn()}
        onZoomOut={() => viewportRef.current?.zoomOut()}
        onReset={() => viewportRef.current?.reset()}
        onCenterBase={() => viewportRef.current?.centerOn(BASE_CENTER.x, BASE_CENTER.y)}
      />

      {/* hint mobile (auto-fade visivo) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <span className="text-[9px] text-white/70 bg-black/40 backdrop-blur px-2 py-0.5 rounded-full">
          Trascina · Pizzica per zoom
        </span>
      </div>
    </div>
  );
}

export { pctToWorld, WORLD_W, WORLD_H, BASE_CENTER };
