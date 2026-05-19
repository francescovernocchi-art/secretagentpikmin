import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { Radar } from "@/components/Radar";
import { EnergyScanner, type EnergyDiscovery } from "@/components/EnergyScanner";
import { supabase } from "@/integrations/supabase/client";
import { grantIngredients, rollIngredients } from "@/lib/ingredients";
import { addPikmin } from "@/lib/pikmin";
import { getSession } from "@/lib/session";
import { PikminCounter } from "@/components/PikminCounter";
import { ScanLine, Sparkles, FlaskConical, Radio } from "lucide-react";

export const Route = createFileRoute("/radar")({
  component: RadarPage,
});

function RadarPage() {
  const [scanOpen, setScanOpen] = useState(false);
  const [last, setLast] = useState<EnergyDiscovery | null>(null);
  const [drops, setDrops] = useState<string[]>([]);

  const onCaught = async (d: EnergyDiscovery) => {
    setScanOpen(false);
    setLast(d);
    const session = getSession();
    const newDrops = rollIngredients("radar");
    try {
      await Promise.all([
        addPikmin(1, "radar", session?.name ?? "lorenzo", { type: d.type }),
        grantIngredients(session?.name ?? "lorenzo", newDrops),
        supabase.from("memories").insert({
          title: `Pikmin ${d.type} catturato`,
          content: "Rilevato tramite scanner energetico.",
        }),
      ]);
    } catch {}
    setDrops(newDrops);
  };

  return (
    <PageShell
      title="Scanner energetico"
      subtitle="Rilevatore di prossimità Pikmin"
      action={<PikminCounter compact />}
    >
      <div className="panel-strong scanline relative overflow-hidden p-6 flex flex-col items-center gap-4">
        <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">// Energia ambientale</p>
        <Radar size={240} />
        <p className="text-xs text-muted-foreground text-center max-w-[260px]">
          Apri lo scanner e muovi il telefono nello spazio. Il segnale aumenta quando
          ti avvicini a una traccia energetica.
        </p>
        <button
          onClick={() => setScanOpen(true)}
          className="btn-neon px-6 py-3 text-sm flex items-center gap-2"
        >
          <ScanLine className="h-4 w-4" /> Avvia scanner
        </button>
      </div>

      <AnimatePresence>
        {last && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="panel p-4 space-y-3"
          >
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
                <p className="font-display text-lg text-glow">Pikmin {last.type.toUpperCase()}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Aggiunto alla squadra
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

      <div className="panel p-4 text-xs text-muted-foreground space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
          <Radio className="h-3 w-3" /> Come funziona
        </p>
        <p>1. Apri lo scanner e dai i permessi camera/movimento.</p>
        <p>2. Muoviti lentamente cercando il segnale più alto.</p>
        <p>3. Quando arrivi al 100% il Pikmin si materializza.</p>
      </div>

      <EnergyScanner open={scanOpen} onClose={() => setScanOpen(false)} onCaught={onCaught} />
    </PageShell>
  );
}
