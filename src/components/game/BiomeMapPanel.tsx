import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crosshair, MapPin, ScanLine } from "lucide-react";
import { BIOMES, VILLAGE_RULES } from "@/data/secretPikminWorld";
import type { BiomeKey } from "@/types/secretPikmin";
import { hapticTap } from "@/lib/haptic";
import { fetchCurrentBiome } from "@/lib/game/scanner";
import { CurrentBiomeStatusPanel } from "@/components/game/CurrentBiomeStatusPanel";

interface BiomeMapPanelProps {
  currentBiome?: BiomeKey;
  showActions?: boolean;
  showGps?: boolean;
}

export function BiomeMapPanel({ currentBiome, showActions = true, showGps = true }: BiomeMapPanelProps) {
  const [biome, setBiome] = useState<BiomeKey>(currentBiome ?? "bosco");

  useEffect(() => {
    if (currentBiome) {
      setBiome(currentBiome);
      return;
    }
    fetchCurrentBiome().then(({ biome: b }) => setBiome(b));
  }, [currentBiome]);

  const active = BIOMES.find((b) => b.key === biome) ?? BIOMES[0];

  return (
    <div className="space-y-4">
      {showGps && <CurrentBiomeStatusPanel compact onBiomeChange={setBiome} />}

      <header className="panel-strong p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,.12),transparent_55%)]" />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Bioma corrente (scanner/spedizioni)
          </p>
          <h2 className="font-display text-xl text-glow mt-1">
            <span className="mr-2">{active.emoji}</span>
            {active.label}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{active.theme}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-full bg-primary/15 border border-primary/25 px-2 py-0.5 text-primary">
              Bonus: {active.bonus}
            </span>
            {active.malus && (
              <span className="rounded-full bg-destructive/10 border border-destructive/25 px-2 py-0.5 text-destructive">
                Malus: {active.malus}
              </span>
            )}
            <span className="rounded-full bg-night/60 border border-border px-2 py-0.5 text-muted-foreground capitalize">
              Rarità: {active.rarity}
            </span>
          </div>
        </div>
      </header>

      <section className="panel p-4 space-y-2 text-xs">
        <Row label="Risorse" value={active.resources.join(", ")} />
        <Row label="Ingredienti" value={active.ingredients.join(", ")} />
        <Row label="Pikmin frequenti" value={active.frequentPikmin.join(", ")} />
        <Row label="Mostri frequenti" value={active.frequentMonsters.join(", ")} />
        <Row label="Eventi" value={active.events.join(", ")} />
        <Row label="Raggio d'azione villaggio" value={`${VILLAGE_RULES.actionRadiusMeters} m`} />
      </section>

      <section className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-primary/80">Tutti i biomi</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BIOMES.map((b) => (
            <div
              key={b.key}
              className={`panel p-2 text-center ${b.key === biome ? "ring-1 ring-primary/60 bg-primary/5" : ""}`}
            >
              <span className="text-xl">{b.emoji}</span>
              <p className="text-[10px] font-display text-glow mt-1">{b.label}</p>
            </div>
          ))}
        </div>
      </section>

      {showActions && (
        <div className="grid grid-cols-3 gap-2">
          <Link to="/mappa" onClick={hapticTap} className="panel p-3 flex flex-col items-center gap-1 active:scale-95 transition">
            <Crosshair className="h-5 w-5 text-primary" />
            <span className="text-[10px] uppercase tracking-wider">Mappa GPS</span>
          </Link>
          <Link to="/radar" onClick={hapticTap} className="panel p-3 flex flex-col items-center gap-1 active:scale-95 transition">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="text-[10px] uppercase tracking-wider">Scansiona</span>
          </Link>
          <Link to="/villaggio" onClick={hapticTap} className="panel p-3 flex flex-col items-center gap-1 active:scale-95 transition">
            <span className="text-lg">🏘️</span>
            <span className="text-[10px] uppercase tracking-wider">Villaggi</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-primary/70">{label}</p>
      <p className="text-muted-foreground">{value}</p>
    </div>
  );
}
