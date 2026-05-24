import { useRef, useState } from "react";
import type { BaseBuilding, BaseRow } from "@/lib/base";
import type { WallSegment } from "@/lib/village/walls";
import type { DayPhase } from "@/lib/daycycle";
import type { FactionKey } from "@/lib/village/factions";
import type { PikminType } from "@/data/pikminSprites";
import { resolveBiome, type BiomeKey } from "@/lib/village/biomes";
import { WORLD_W, WORLD_H, BASE_CENTER, pctToWorld } from "@/lib/village/mapProjection";
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
 * Mappa multilayer del villaggio (tile + layer separati), con pan/zoom su scena reale.
 * Niente immagine bioma di sfondo: tutto è dati + componenti.
 */
export function VillageMap({
  agent, base, buildings, walls, phase, pikminCount, breakdown, threats, tick, onSelectBuilding,
}: Props) {
  const biomeKey = (resolveBiome(base.theme).key) as BiomeKey;
  const viewportRef = useRef<ViewportHandle>(null);
  const [scale, setScale] = useState(0.8);

  return (
    <div className="relative">
      <VillageMapViewport
        ref={viewportRef}
        worldWidth={WORLD_W}
        worldHeight={WORLD_H}
        height={520}
        onScaleChange={setScale}
      >
        {/* 1 - Terreno */}
        <TerrainLayer seed={agent} biome={biomeKey} />
        {/* 2 - Sentieri */}
        <PathLayer buildings={buildings} />
        {/* 3 - Campi */}
        <FieldsLayer buildings={buildings} />
        {/* 5 - Mura */}
        <WallsLayer walls={walls} />
        {/* 4 - Decor giganti del bioma */}
        <ObjectsLayer biome={biomeKey} seed={agent} />
        {/* 6 - Edifici */}
        <BuildingsLayer buildings={buildings} onSelect={onSelectBuilding} tick={tick} />
        {/* 7 - Pikmin (assoluto su tutto il world) */}
        <div className="absolute inset-0">
          <PikminLayer
            buildings={buildings}
            pikminCount={pikminCount}
            breakdown={breakdown}
            threat={threats.length > 0}
          />
        </div>
        {/* 8 - Mostri reali */}
        <MonsterThreatLayer threats={threats} />
        {/* 9 - Effetti */}
        <EffectsLayer phase={phase} faction={(base.faction as FactionKey) ?? "esploratori"} />
        {/* 11 - HUD Campo Base */}
        <HudLayer baseLevel={base.level} baseName={base.base_name ?? base.name} />
        {/* tutorial overlay quando vuoto */}
        {buildings.length === 0 && (
          <div
            className="absolute panel-strong px-4 py-3 text-center"
            style={{ left: BASE_CENTER.x - 140, top: BASE_CENTER.y + 40, width: 280 }}
          >
            <p className="text-xs font-display text-glow">Il tuo villaggio è vuoto</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tocca <b className="text-primary">Costruisci</b> per iniziare dal Centro Comando.
            </p>
          </div>
        )}
      </VillageMapViewport>

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

// Re-export per chi voglia posizionare cose esternamente
export { pctToWorld, WORLD_W, WORLD_H, BASE_CENTER };
