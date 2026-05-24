import { useRef, useState } from "react";
import type { BaseBuilding, BaseRow } from "@/lib/base";
import type { WallSegment } from "@/lib/village/walls";
import type { DayPhase } from "@/lib/daycycle";
import type { FactionKey } from "@/lib/village/factions";
import { resolveBiome, BIOMES, type BiomeKey } from "@/lib/village/biomes";
import { WORLD_W, WORLD_H, BASE_CENTER, pctToWorld, worldToPct } from "@/lib/village/mapProjection";
import { VillageMapViewport, type ViewportHandle } from "./VillageMapViewport";
import { VillageMapControls } from "./VillageMapControls";
import { TerrainLayer } from "./layers/TerrainLayer";
import { PathLayer } from "./layers/PathLayer";
import { FieldsLayer } from "./layers/FieldsLayer";
import { BuildingsLayer } from "./layers/BuildingsLayer";
import { WallsLayer } from "./layers/WallsLayer";
import { ObjectsLayer } from "./layers/ObjectsLayer";
import { EdgeFogLayer } from "./layers/EdgeFogLayer";
import { EffectsLayer } from "./layers/EffectsLayer";
import { HudLayer } from "./layers/HudLayer";
import { VillagePikminLayer, type PikminLayerPrefs } from "@/components/pikmin/VillagePikminLayer";

interface Props {
  agent: string;
  base: BaseRow;
  buildings: BaseBuilding[];
  walls: WallSegment[];
  phase: DayPhase;
  pikminCount: number;
  breakdown?: Record<string, number>;
  threat?: boolean;
  tick: number;
  pikminPrefs?: PikminLayerPrefs;
  onSelectBuilding?: (b: BaseBuilding) => void;
  /** Modalità "scegli posizione" per costruzione: callback con px/py 0..100. */
  placementActive?: boolean;
  onPlace?: (pct: { x: number; y: number }) => void;
}

/**
 * Mappa villaggio fullscreen. NESSUN mostro nella scena. Sfondo intonato al bioma.
 * HUD/controlli sono renderizzati FUORI da qui (sopra, in `villaggio.tsx`).
 */
export function VillageMap({
  agent, base, buildings, walls, phase, pikminCount, breakdown, threat, tick,
  pikminPrefs, onSelectBuilding, placementActive, onPlace,
}: Props) {
  const biomeKey = (resolveBiome(base.theme).key) as BiomeKey;
  const viewportRef = useRef<ViewportHandle>(null);
  const [scale, setScale] = useState(1);

  const handleWorldClick = (wx: number, wy: number) => {
    if (!placementActive || !onPlace) return;
    const p = worldToPct(wx, wy);
    onPlace({ x: Math.max(5, Math.min(95, p.px)), y: Math.max(5, Math.min(95, p.py)) });
  };

  return (
    <div className="absolute inset-0">
      <VillageMapViewport
        ref={viewportRef}
        worldWidth={WORLD_W}
        worldHeight={WORLD_H}
        backgroundColor={BIOMES[biomeKey].accent}
        onScaleChange={setScale}
        onWorldClick={placementActive ? handleWorldClick : undefined}
      >
        <TerrainLayer seed={agent} biome={biomeKey} />
        <PathLayer buildings={buildings} />
        <FieldsLayer buildings={buildings} />
        <WallsLayer walls={walls} />
        <ObjectsLayer biome={biomeKey} seed={agent} />
        <BuildingsLayer buildings={buildings} onSelect={onSelectBuilding} tick={tick} />
        <div className="absolute inset-0">
          <VillagePikminLayer
            buildings={buildings}
            pikminCount={pikminCount}
            breakdown={breakdown}
            threat={threat}
            prefs={pikminPrefs}
          />
        </div>
        <EffectsLayer phase={phase} faction={(base.faction as FactionKey) ?? "esploratori"} />
        <HudLayer baseLevel={base.level} baseName={base.base_name ?? base.name} />
        <EdgeFogLayer biome={biomeKey} />

        {buildings.length === 0 && !placementActive && (
          <div
            className="absolute panel-strong px-4 py-3 text-center pointer-events-none"
            style={{ left: BASE_CENTER.x - 140, top: BASE_CENTER.y + 60, width: 280 }}
          >
            <p className="text-xs font-display text-glow">Il tuo villaggio è vuoto</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Apri <b className="text-primary">Costruzione</b> per piazzare la prima struttura.
            </p>
          </div>
        )}
      </VillageMapViewport>

      {/* placement hint overlay */}
      {placementActive && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 panel-strong px-3 py-1.5 text-[11px] pointer-events-none animate-pulse">
          ✋ Tocca la mappa per piazzare la struttura
        </div>
      )}

      <VillageMapControls
        scale={scale}
        onZoomIn={() => viewportRef.current?.zoomIn()}
        onZoomOut={() => viewportRef.current?.zoomOut()}
        onReset={() => viewportRef.current?.reset()}
        onCenterBase={() => viewportRef.current?.centerOn(BASE_CENTER.x, BASE_CENTER.y)}
      />
    </div>
  );
}

export { pctToWorld, WORLD_W, WORLD_H, BASE_CENTER };
