import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Navigation, Loader2, RefreshCw } from "lucide-react";
import { BIOMES, getBiomeByKey } from "@/data/secretPikminWorld";
import {
  fetchPlayerLocation,
  syncGeolocationToProfile,
  setManualBiome,
} from "@/lib/game/player-location";
import { agentKeyFromSession } from "@/lib/game/planet";
import { getSession } from "@/lib/session";
import { hapticTap } from "@/lib/haptic";
import type { BiomeKey } from "@/types/secretPikmin";
import type { PlayerLocationState } from "@/types/phase4-db";

interface CurrentBiomeStatusPanelProps {
  compact?: boolean;
  onBiomeChange?: (biome: BiomeKey) => void;
}

export function CurrentBiomeStatusPanel({ compact = false, onBiomeChange }: CurrentBiomeStatusPanelProps) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKeyFromSession(session?.role);
  const [loc, setLoc] = useState<PlayerLocationState | null>(null);
  const [syncing, setSyncing] = useState(false);

  const reload = () => fetchPlayerLocation(agent).then(setLoc);

  useEffect(() => { reload(); }, [agent]);

  const syncGps = async () => {
    hapticTap();
    setSyncing(true);
    try {
      const state = await syncGeolocationToProfile(agent);
      setLoc(state);
      onBiomeChange?.(state.current_biome as BiomeKey);
      toast.success(`Bioma: ${getBiomeByKey(state.current_biome as BiomeKey)?.label ?? state.current_biome}`);
    } catch {
      toast.error("Geolocalizzazione negata — usa selezione manuale");
    } finally { setSyncing(false); }
  };

  const pickBiome = async (biome: BiomeKey) => {
    hapticTap();
    const state = await setManualBiome(agent, biome);
    setLoc(state);
    onBiomeChange?.(biome);
    toast.success(`Bioma impostato: ${getBiomeByKey(biome)?.label}`);
  };

  const active = loc ? getBiomeByKey(loc.current_biome as BiomeKey) : null;

  return (
    <section className="space-y-3">
      {!compact && (
        <header>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Bioma GPS</p>
          <h2 className="font-display text-xl text-glow">Posizione e bioma attivo</h2>
        </header>
      )}

      <div className="panel-strong p-4 space-y-2">
        {active && (
          <>
            <p className="text-2xl">{active.emoji} <span className="font-display text-glow">{active.label}</span></p>
            <p className="text-xs text-muted-foreground">{active.theme}</p>
          </>
        )}
        {loc && (
          <div className="text-[10px] text-muted-foreground space-y-1">
            <p>Fonte: {loc.source === "gps" ? "GPS" : loc.source === "manual" ? "Manuale" : "Default"}</p>
            {loc.lat != null && (
              <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {loc.lat.toFixed(5)}, {loc.lng?.toFixed(5)}</p>
            )}
          </div>
        )}
        <button onClick={syncGps} disabled={syncing} className="btn-neon w-full py-2 text-xs flex items-center justify-center gap-2">
          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
          Aggiorna da GPS
        </button>
      </div>

      {!compact && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Fallback manuale
          </p>
          <div className="grid grid-cols-4 gap-1">
            {BIOMES.map((b) => (
              <button
                key={b.key}
                onClick={() => pickBiome(b.key)}
                className={`panel p-2 text-center text-xs ${loc?.current_biome === b.key ? "ring-1 ring-primary" : ""}`}
              >
                <span className="text-lg">{b.emoji}</span>
                <p className="text-[9px] mt-0.5 truncate">{b.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
