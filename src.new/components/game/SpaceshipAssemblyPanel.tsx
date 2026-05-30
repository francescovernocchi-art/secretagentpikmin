import { Rocket, MapPin, Sparkles } from "lucide-react";
import { useSpaceshipParts } from "@/hooks/useGameData";
import { shipProgressPercent } from "@/lib/game/spaceship";
import { getLastCollectedShipPart, getNextShipHint } from "@/lib/game/scanner";
import { displayAgentName } from "@/lib/game/planet";
import { ShipPreviewSvg } from "@/components/game/assets/GameIcons";
import { ParticleEffect } from "@/components/fx/ParticleEffect";

interface SpaceshipAssemblyPanelProps {
  compact?: boolean;
}

/** Visualizza la navicella a pezzi con progresso e indizi */
export function SpaceshipAssemblyPanel({ compact = false }: SpaceshipAssemblyPanelProps) {
  const { parts } = useSpaceshipParts();
  const pct = shipProgressPercent(parts);
  const lastPart = getLastCollectedShipPart();
  const nextHint = getNextShipHint();
  const collected = parts.filter((p) => p.collected);
  const missing = parts.filter((p) => !p.collected);

  return (
    <section className="panel-strong relative overflow-hidden p-4 space-y-4">
      <ParticleEffect variant="ship-glow" density="low" className="opacity-40" />
      <span className="hud-corner tl" />
      <span className="hud-corner br" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
            <Rocket className="h-3 w-3" /> Assemblaggio Navicella
          </p>
          <p className="font-display text-2xl text-glow">{pct}%</p>
          <p className="text-[10px] text-muted-foreground">
            {collected.length}/{parts.length} pezzi montati
          </p>
        </div>
        <div className="h-14 w-14 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 grid place-items-center animate-pulse-slow p-1">
          <ShipPreviewSvg className="w-full h-full" />
        </div>
      </div>

      <div className="progress-mission h-2 rounded-full overflow-hidden">
        <div
          className="progress-mission-fill progress-ship-fill h-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className={`grid gap-2 ${compact ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6"}`}>
        {parts.map((p) => (
          <div
            key={p.key}
            title={p.name}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition ${
              p.collected
                ? "border-primary/50 bg-primary/10 opacity-100 shadow-[0_0_12px_rgba(132,255,159,.25)]"
                : "border-border/40 bg-night/40 opacity-40 grayscale"
            }`}
          >
            <span className="text-xl">{p.emoji}</span>
            {!compact && (
              <span className="text-[8px] uppercase tracking-wider text-center leading-tight text-muted-foreground">
                {p.name.split(" ").slice(-1)[0]}
              </span>
            )}
          </div>
        ))}
      </div>

      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {lastPart && (
            <div className="panel p-3 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-primary/80">Ultimo pezzo</p>
                <p className="font-medium">{lastPart.emoji} {lastPart.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  da {displayAgentName(lastPart.collected_by ?? "papa")}
                </p>
              </div>
            </div>
          )}
          {nextHint && (
            <div className="panel p-3 flex items-start gap-2">
              <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-primary/80">Prossimo indizio</p>
                <p className="font-medium">{nextHint.partName}</p>
                <p className="text-[10px] text-muted-foreground">{nextHint.hint}</p>
              </div>
            </div>
          )}
          {missing.length === 0 && (
            <p className="col-span-2 text-center text-primary text-sm font-display">Navicella completa! Pronta al decollo.</p>
          )}
        </div>
      )}
    </section>
  );
}
