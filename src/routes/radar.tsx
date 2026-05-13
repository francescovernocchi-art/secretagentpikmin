import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { Radar } from "@/components/Radar";
import { Camera, QrCode, Sparkles, ScanLine } from "lucide-react";

export const Route = createFileRoute("/_app/radar")({
  component: RadarPage,
});

function RadarPage() {
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);

  const start = () => {
    setScanning(true);
    setDetected(false);
    setTimeout(() => {
      setScanning(false);
      setDetected(true);
    }, 2800);
  };

  return (
    <PageShell title="Radar Pikmin" subtitle="Scanner di prossimità · beta">
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
                Un Pikmin è stato rilevato nelle vicinanze.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={start} disabled={scanning} className="btn-neon px-6 py-3 text-sm flex items-center gap-2 disabled:opacity-60">
          <ScanLine className="h-4 w-4" /> {scanning ? "Scanning…" : "Attiva Scanner"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Future icon={<Camera className="h-5 w-5" />} label="Fotocamera" />
        <Future icon={<QrCode className="h-5 w-5" />} label="QR Scanner" />
        <Future icon={<Sparkles className="h-5 w-5" />} label="AR Pikmin" />
      </div>

      <p className="text-center text-xs text-muted-foreground/80">
        Modulo radar in preparazione. Presto potrai cacciare i Pikmin nel mondo reale.
      </p>
    </PageShell>
  );
}

function Future({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="panel p-3 flex flex-col items-center gap-1 text-center text-muted-foreground">
      <span className="text-primary">{icon}</span>
      <p className="text-[10px] uppercase tracking-widest">{label}</p>
      <p className="text-[9px] text-muted-foreground/60">soon</p>
    </div>
  );
}
