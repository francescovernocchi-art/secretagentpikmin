import { phaseOverlay, type DayPhase } from "@/lib/daycycle";
import { VillageParticles } from "../VillageParticles";
import type { FactionKey } from "@/lib/village/factions";

interface Props { phase: DayPhase; faction: FactionKey; }

/** Giorno/notte + particelle ambientali del bioma/faction. */
export function EffectsLayer({ phase, faction }: Props) {
  const overlay = phaseOverlay(phase);
  const bg = typeof overlay === "string" ? overlay : undefined;
  return (
    <>
      <div className="absolute inset-0 pointer-events-none mix-blend-multiply"
        style={bg ? { background: bg } : undefined} aria-hidden />
      <div className="absolute inset-0 pointer-events-none">
        <VillageParticles faction={faction} density={phase === "notte" ? 6 : 14} />
      </div>
    </>
  );
}
