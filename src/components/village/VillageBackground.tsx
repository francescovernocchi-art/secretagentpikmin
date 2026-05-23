import type { FactionKey } from "@/lib/village/factions";
import type { DayPhase } from "@/lib/daycycle";

interface Props {
  faction: FactionKey;
  phase: DayPhase;
}

const FACTION_BG: Record<FactionKey, { sky: [string, string]; ground: [string, string]; pattern: string }> = {
  eco: {
    sky: ["#bff5c0", "#5fb96b"],
    ground: ["#3d6b4d", "#5a8a5c"],
    pattern: "radial-gradient(circle at 20% 80%, rgba(124,217,154,0.4), transparent 40%), radial-gradient(circle at 80% 30%, rgba(168,224,99,0.3), transparent 50%)",
  },
  tech: {
    sky: ["#1e3a8a", "#0c1a3e"],
    ground: ["#1a1f3a", "#2e3a6b"],
    pattern: "linear-gradient(0deg, rgba(125,211,252,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.15) 1px, transparent 1px)",
  },
  battle: {
    sky: ["#7c2d12", "#451a03"],
    ground: ["#3a2418", "#5a3a28"],
    pattern: "repeating-linear-gradient(45deg, rgba(251,146,60,0.08) 0 8px, transparent 8px 16px)",
  },
  mystic: {
    sky: ["#4c1d95", "#1e0a40"],
    ground: ["#2a1454", "#4c2a7a"],
    pattern: "radial-gradient(circle at 30% 50%, rgba(192,132,252,0.35), transparent 45%), radial-gradient(circle at 70% 70%, rgba(233,213,255,0.2), transparent 35%)",
  },
};

const PHASE_TINT: Record<DayPhase, string> = {
  alba: "linear-gradient(180deg, rgba(254,215,170,0.25) 0%, rgba(245,158,11,0.1) 50%, transparent 100%)",
  giorno: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)",
  tramonto: "linear-gradient(180deg, rgba(251,146,60,0.28) 0%, rgba(244,63,94,0.18) 60%, rgba(30,16,40,0.3) 100%)",
  notte: "linear-gradient(180deg, rgba(8,12,30,0.65) 0%, rgba(2,6,23,0.85) 100%)",
};

export function VillageBackground({ faction, phase }: Props) {
  const bg = FACTION_BG[faction] ?? FACTION_BG.eco;
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* sky */}
      <div
        className="absolute inset-x-0 top-0 h-[55%]"
        style={{ background: `linear-gradient(180deg, ${bg.sky[0]}, ${bg.sky[1]})` }}
      />
      {/* ground (isometric) */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          background: `linear-gradient(180deg, ${bg.ground[0]}, ${bg.ground[1]})`,
          transform: "perspective(600px) rotateX(35deg)",
          transformOrigin: "top",
        }}
      />
      {/* horizon line */}
      <div
        className="absolute left-0 right-0 h-px"
        style={{
          top: "45%",
          background: `linear-gradient(90deg, transparent, ${bg.ground[1]} 30%, ${bg.ground[1]} 70%, transparent)`,
          boxShadow: `0 0 18px ${bg.ground[1]}`,
        }}
      />
      {/* faction pattern */}
      <div
        className="absolute inset-0 opacity-60 mix-blend-overlay"
        style={{ background: bg.pattern, backgroundSize: faction === "tech" ? "32px 32px" : undefined }}
      />
      {/* day/night tint */}
      <div className="absolute inset-0" style={{ background: PHASE_TINT[phase] }} />
    </div>
  );
}
