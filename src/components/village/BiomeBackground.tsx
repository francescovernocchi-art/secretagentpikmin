import type { DayPhase } from "@/lib/daycycle";
import { resolveBiome } from "@/lib/village/biomes";

interface Props {
  theme: string | null | undefined;
  phase: DayPhase;
}

const PHASE_TINT: Record<DayPhase, string> = {
  alba:     "linear-gradient(180deg, rgba(254,215,170,0.25) 0%, rgba(245,158,11,0.10) 50%, transparent 100%)",
  giorno:   "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
  tramonto: "linear-gradient(180deg, rgba(251,146,60,0.28) 0%, rgba(244,63,94,0.18) 60%, rgba(30,16,40,0.30) 100%)",
  notte:    "linear-gradient(180deg, rgba(8,12,30,0.55) 0%, rgba(2,6,23,0.78) 100%)",
};

/** Sfondo bioma "oggetti giganti" — immagine AI + tinta giorno/notte. */
export function BiomeBackground({ theme, phase }: Props) {
  const biome = resolveBiome(theme);
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <img
        src={biome.image}
        alt={`Bioma ${biome.label}`}
        loading="lazy"
        width={1536}
        height={1024}
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
      />
      <div className="absolute inset-0 pointer-events-none" style={{ background: PHASE_TINT[phase] }} />
    </div>
  );
}
