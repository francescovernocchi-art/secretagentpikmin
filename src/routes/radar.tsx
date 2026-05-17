import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { Radar } from "@/components/Radar";
import { CameraCapture } from "@/components/CameraCapture";
import { supabase } from "@/integrations/supabase/client";
import { grantIngredients, rollIngredients } from "@/lib/ingredients";
import { addPikmin } from "@/lib/pikmin";
import { getSession } from "@/lib/session";
import { PikminCounter } from "@/components/PikminCounter";
import { Camera, ScanLine, Sparkles, FlaskConical } from "lucide-react";

export const Route = createFileRoute("/radar")({
  component: RadarPage,
});

function RadarPage() {
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [lastShot, setLastShot] = useState<string | null>(null);
  const [drops, setDrops] = useState<string[]>([]);

  const start = () => {
    setScanning(true);
    setDetected(false);
    setTimeout(() => {
      setScanning(false);
      setDetected(true);
    }, 2800);
  };

  const onCaptured = async (url: string) => {
    setLastShot(url);
    setDetected(true);
    await supabase.from("memories").insert({
      title: "Pikmin avvistato",
      content: "Avvistamento registrato dal radar.",
      image_url: url,
    });
    // Drop ingrediente dal Pikmin catturato
    const newDrops = rollIngredients("radar");
    await grantIngredients("lorenzo", newDrops);
    setDrops(newDrops);
    // +1 Pikmin alla squadra, tipo casuale
    const session = getSession();
    const types = ["red", "yellow", "blue", "purple", "white", "rock", "wing", "ice", "glow"];
    const type = types[Math.floor(Math.random() * types.length)];
    try {
      await addPikmin(1, "radar", session?.name ?? "lorenzo", { type });
    } catch {}
  };

  return (
    <PageShell
      title="Radar Pikmin"
      subtitle="Scanner di prossimità · live"
      action={<PikminCounter compact />}
    >
      <div className="panel-strong scanline relative overflow-hidden p-6 flex flex-col items-center gap-4">
        <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">// Scansione zona</p>
        <Radar size={260} />
        <AnimatePresence>
          {scanning && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-primary text-glow text-sm animate-flicker"
            >
              Scansione in corso…
            </motion.p>
          )}
          {detected && !scanning && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <p className="text-primary text-glow font-display text-lg">Pikmin Rilevato!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Attiva la fotocamera per catturare la prova.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={start}
            disabled={scanning}
            className="btn-neon px-5 py-3 text-sm flex items-center gap-2 disabled:opacity-60"
          >
            <ScanLine className="h-4 w-4" /> {scanning ? "Scanning…" : "Pre-scan"}
          </button>
          <button
            onClick={() => setCamOpen(true)}
            className="btn-neon px-5 py-3 text-sm flex items-center gap-2"
          >
            <Camera className="h-4 w-4" /> Modalità Caccia
          </button>
        </div>
      </div>

      {lastShot && (
        <div className="panel p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Ultimo avvistamento
          </p>
          <img
            src={lastShot}
            alt="Avvistamento"
            className="w-full rounded-xl border border-primary/30 glow-soft"
          />
          <p className="text-xs text-muted-foreground">Salvato nell'archivio ricordi.</p>
          <AnimatePresence>
            {drops.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/30 p-2"
              >
                <FlaskConical className="h-4 w-4 text-primary" />
                <p className="text-xs text-primary">
                  Il Pikmin ha lasciato cadere <b>{drops.length}</b> ingrediente
                  {drops.length > 1 ? "i" : ""}! Vai al Lab.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground/80">
        Punta la fotocamera intorno a te. Quando vedi un Pikmin, scatta!
      </p>

      <CameraCapture
        open={camOpen}
        onClose={() => setCamOpen(false)}
        onCaptured={onCaptured}
        overlayLabel="// Caccia Pikmin"
        radarOverlay
        folder="radar"
      />
    </PageShell>
  );
}
