import { useEffect, useState } from "react";
import { Radio, Shield, ShoppingBag, Rocket, MapPin } from "lucide-react";
import { canRemoteControlVillage, fetchActiveVillage, fetchPrimaryVillage } from "@/lib/game/villages";
import { fetchPlayerLocation } from "@/lib/game/player-location";
import { agentKeyFromSession } from "@/lib/game/planet";
import { getSession } from "@/lib/session";
import type { RemoteControlTier } from "@/types/phase4-db";

const TIER_LABELS: Record<RemoteControlTier, string> = {
  none: "Nessuno",
  base: "Comandi base",
  expeditions: "+ Spedizioni remote",
  full: "+ Market e trasformazioni",
};

export function RemoteControlPanel({ compact = false }: { compact?: boolean }) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKeyFromSession(session?.role);
  const [tier, setTier] = useState<RemoteControlTier>("none");
  const [inRange, setInRange] = useState(false);
  const [ccLevel, setCcLevel] = useState(1);
  const [checks, setChecks] = useState({ base: false, expeditions: false, market: false });
  const [loc, setLoc] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  useEffect(() => {
    (async () => {
      const village = await fetchActiveVillage(agent);
      if (!village) return;
      const primary = await fetchPrimaryVillage(agent);
      setCcLevel(primary.controlCenterLevel);
      const [b, e, m, playerLoc] = await Promise.all([
        canRemoteControlVillage(agent, village.id, "base"),
        canRemoteControlVillage(agent, village.id, "expeditions"),
        canRemoteControlVillage(agent, village.id, "market"),
        fetchPlayerLocation(agent),
      ]);
      setTier(b.tier);
      setInRange(b.inRange);
      setChecks({ base: b.allowed, expeditions: e.allowed, market: m.allowed });
      setLoc({ lat: playerLoc.lat, lng: playerLoc.lng });
    })();
  }, [agent]);

  return (
    <section className="space-y-3">
      {!compact && (
        <header>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Controllo Remoto</p>
          <h2 className="font-display text-xl text-glow">Centro di Controllo Lv{ccLevel}</h2>
        </header>
      )}

      <div className="panel p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Radio className={`h-4 w-4 ${inRange ? "text-primary" : "text-muted-foreground"}`} />
          <span>{inRange ? "Nel raggio d'azione GPS" : "Fuori raggio — serve CC remoto"}</span>
        </div>
        {loc.lat != null && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Posizione: {loc.lat.toFixed(5)}, {loc.lng?.toFixed(5)}
          </p>
        )}
        <p className="text-primary font-medium">Tier remoto: {TIER_LABELS[tier]}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <PermitCard icon={Shield} label="Comandi base" allowed={checks.base} />
        <PermitCard icon={Rocket} label="Spedizioni" allowed={checks.expeditions} need="CC Lv3+" />
        <PermitCard icon={ShoppingBag} label="Market/Lab" allowed={checks.market} need="CC Lv5" />
      </div>
    </section>
  );
}

function PermitCard({ icon: Icon, label, allowed, need }: { icon: typeof Shield; label: string; allowed: boolean; need?: string }) {
  return (
    <div className={`panel p-3 ${allowed ? "border-primary/30 bg-primary/5" : "opacity-60"}`}>
      <Icon className={`h-4 w-4 mb-1 ${allowed ? "text-primary" : "text-muted-foreground"}`} />
      <p className="font-medium">{label}</p>
      <p className="text-[10px] text-muted-foreground">{allowed ? "✓ Consentito" : need ?? "Bloccato"}</p>
    </div>
  );
}
