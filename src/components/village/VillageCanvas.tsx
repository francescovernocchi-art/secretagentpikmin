import { motion } from "framer-motion";
import type { FactionKey } from "@/lib/village/factions";
import type { BaseBuilding } from "@/lib/base";
import type { DayPhase } from "@/lib/daycycle";
import type { VillageCosmetics } from "@/lib/village/cosmetics";
import type { WallSegment } from "@/lib/village/walls";
import { VillageBackground } from "./VillageBackground";
import { BiomeBackground } from "./BiomeBackground";
import { BuildingSprite } from "./BuildingSprite";
import { WallLayer } from "./WallLayer";
import { DefenseRangeLayer } from "./DefenseRangeLayer";
import { VillageParticles } from "./VillageParticles";
import { DayNightLayer } from "./DayNightLayer";
import { PikminAmbientLayer } from "./PikminAmbientLayer";

interface Props {
  faction: FactionKey;
  phase: DayPhase;
  buildings: BaseBuilding[];
  walls: WallSegment[];
  cosmetics: VillageCosmetics;
  threat: boolean;
  onSelectBuilding?: (b: BaseBuilding) => void;
  tick: number;
  /** Se passato, usa lo sfondo bioma "oggetti giganti" invece del fallback gradient. */
  biome?: string | null;
  /** Se true il canvas non gestisce le proprie dimensioni (lasciate al wrapper zoom/pan). */
  embedded?: boolean;
}

/** Scena viva del villaggio: background + sprites + Pikmin + particelle + giorno/notte. */
export function VillageCanvas({
  faction,
  phase,
  buildings,
  walls,
  cosmetics,
  threat,
  onSelectBuilding,
  tick,
  biome,
  embedded,
}: Props) {
  const Wrapper: any = embedded ? "div" : motion.div;
  const wrapperProps = embedded
    ? { className: "relative w-full h-full overflow-hidden" }
    : {
        key: faction + phase,
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.5, ease: "easeOut" },
        className: "relative w-full overflow-hidden rounded-2xl border border-primary/30",
        style: { aspectRatio: "16/11", minHeight: 320 },
      };
  return (
    <Wrapper {...wrapperProps}>
      {biome ? <BiomeBackground theme={biome} phase={phase} /> : <VillageBackground faction={faction} phase={phase} />}
      <DayNightLayer phase={phase} />

      {/* edifici */}
      <div className="absolute inset-0">
        {buildings.map((b) => {
          let progress: number | undefined = undefined;
          if (b.status !== "idle" && b.build_end_at && b.started_at) {
            const total = new Date(b.build_end_at).getTime() - new Date(b.started_at).getTime();
            const elapsed = Date.now() - new Date(b.started_at).getTime();
            progress = Math.max(0, Math.min(1, elapsed / total));
          }
          // tick triggers re-render for progress bar
          void tick;
          return (
            <BuildingSprite
              key={b.id}
              building={b}
              onTap={onSelectBuilding}
              progress={progress}
            />
          );
        })}
      </div>

      {/* mura + cerchi difesa */}
      <div className="pointer-events-none absolute inset-0">
        <DefenseRangeLayer buildings={buildings} />
        <WallLayer walls={walls} />
      </div>

      {/* pikmin che vivono nel villaggio */}
      <PikminAmbientLayer
        faction={faction}
        buildings={buildings}
        threat={threat}
        phase={phase}
        cosmetics={cosmetics}
      />

      {/* particelle ambientali */}
      <VillageParticles faction={faction} density={phase === "notte" ? 6 : 14} />

      {/* tutorial se vuoto */}
      {buildings.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="panel-strong px-4 py-3 text-center max-w-[80%]">
            <p className="text-xs font-display text-glow">Il tuo villaggio è vuoto</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tocca <b className="text-primary">Costruisci</b> per iniziare dal Centro Comando.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
