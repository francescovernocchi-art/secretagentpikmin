import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Radar } from "@/components/Radar";
import { EnergyScanner, type EnergyDiscovery } from "@/components/EnergyScanner";
import { getSession } from "@/lib/session";
import { PikminCounter } from "@/components/PikminCounter";
import { ScanLine, Sparkles, FlaskConical, Radio, Camera } from "lucide-react";
import { RadarScannerPanel } from "@/components/game/RadarScannerPanel";
import { BiomeMapPanel } from "@/components/game/BiomeMapPanel";
import { processEnergyScannerCatch } from "@/lib/game/scanner";
import { grantIngredients, rollIngredients } from "@/lib/ingredients";
import { addPikmin } from "@/lib/pikmin";
import { supabase } from "@/integrations/supabase/client";
import { ParticleEffect } from "@/components/fx/ParticleEffect";

export const Route = createFileRoute("/radar")({
  component: RadarPage,
});

function RadarPage() {
  const [scanOpen, setScanOpen] = useState(false);
  const [last, setLast] = useState<EnergyDiscovery | null>(null);
  const [lastEffects, setLastEffects] = useState<string[]>([]);
  const [lastLabel, setLastLabel] = useState<string>("");
  const [drops, setDrops] = useState<string[]>([]);

  const onCaught = async (d: EnergyDiscovery) => {
    setScanOpen(false);
    setLast(d);
    const session = getSession();
    const agent = session?.role ?? "lorenzo";

    try {
      const { discovery, effects } = await processEnergyScannerCatch(d.type);
      setLastLabel(discovery.label);
      setLastEffects(effects);

      const newDrops = rollIngredients("radar");
      if (isSupabaseConfigured()) {
        await Promise.all([
          addPikmin(1, "radar", session?.name ?? agent, { type: d.type }),
          grantIngredients(session?.name ?? agent, newDrops),
          supabase.from("memories").insert({
            title: discovery.label,
            content: `Rilevato tramite scanner · ${effects.join(", ")}`,
          }),
        ]);
      }
      setDrops(newDrops);
      toast.success(effects.join(" · ") || "Ritrovamento salvato");
    } catch {
      setLastLabel(`Pikmin ${d.type}`);
      setLastEffects(["Salvato in locale"]);
    }
  };

  return (
    <PageShell
      title="Radar e Scanner"
      subtitle="Geolocalizzazione · fotocamera · oggetti rari · Pikmin selvatici"
      theme="map"
      action={<PikminCounter compact />}
    >
      <div className="panel-strong scanline relative overflow-hidden p-6 flex flex-col items-center gap-4">
        <ParticleEffect variant="radar" />
        <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">// Energia ambientale</p>
        <Radar size={240} />
        <p className="text-xs text-muted-foreground text-center max-w-[260px]">
          Apri lo scanner e muovi il telefono nello spazio. Il segnale aumenta quando ti avvicini a una traccia energetica.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={() => setScanOpen(true)} className="btn-neon px-6 py-3 text-sm flex items-center gap-2">
            <ScanLine className="h-4 w-4" /> Avvia scanner
          </button>
          <button onClick={() => setScanOpen(true)} className="panel-strong px-6 py-3 text-sm flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" /> Scansiona area
          </button>
        </div>
      </div>

      <AnimatePresence>
        {last && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="panel p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Ultima cattura
            </p>
            <div className="flex items-center gap-3">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center text-2xl"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${last.color}, oklch(0.18 0.06 250))`,
                  boxShadow: `0 0 24px ${last.color}`,
                }}
              >
                🌱
              </div>
              <div>
                <p className="font-display text-lg text-glow">{lastLabel || `Pikmin ${last.type.toUpperCase()}`}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {lastEffects.join(" · ") || "Aggiunto alla squadra"}
                </p>
              </div>
            </div>
            {drops.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/30 p-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                <p className="text-xs text-primary">
                  Drop: <b>{drops.length}</b> ingrediente{drops.length > 1 ? "i" : ""} per il Lab.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <RadarScannerPanel biomeScan onScanComplete={(r) => toast.success(`${r.emoji} ${r.label} — ${r.effects.join(", ")}`)} />

      <BiomeMapPanel showActions={false} />

      <div className="panel p-4 text-xs text-muted-foreground space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
          <Radio className="h-3 w-3" /> Come funziona
        </p>
        <p>1. Apri lo scanner e dai i permessi camera/movimento.</p>
        <p>2. Muoviti lentamente cercando il segnale più alto.</p>
        <p>3. Ritrovamento coerente col bioma → inventario / bestiario / squadra / navicella.</p>
      </div>

      <EnergyScanner open={scanOpen} onClose={() => setScanOpen(false)} onCaught={onCaught} />
    </PageShell>
  );
}
