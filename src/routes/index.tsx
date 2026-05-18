import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loginWithPin, getSession } from "@/lib/session";
import { Radar } from "@/components/Radar";
import { Lock, Delete } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [booting, setBooting] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    // Splash breve solo lato client, evita mismatch SSR e loading infinito
    setBooting(true);
    const t = setTimeout(() => setBooting(false), 900);
    const stuckTimer = setTimeout(() => setStuck(true), 6000);
    try {
      if (getSession()) {
        navigate({ to: "/base" });
      }
    } catch (e) {
      console.warn("[boot] session check failed", e);
    }
    return () => {
      clearTimeout(t);
      clearTimeout(stuckTimer);
    };
  }, [navigate]);

  const press = (k: string) => {
    setError(false);
    if (k === "del") return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      setTimeout(async () => {
        const s = await loginWithPin(next);
        if (s) navigate({ to: "/base" });
        else {
          setError(true);
          setPin("");
        }
      }, 220);
    }
  };

  if (booting) {
    return (
      <div className="fixed inset-0 grid-bg flex flex-col items-center justify-center gap-6 px-6">
        <Radar size={180} />
        <p className="font-display text-primary text-glow text-sm uppercase tracking-[0.4em] animate-flicker">
          Connessione alla base in corso…
        </p>
        {stuck && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <p className="text-xs text-muted-foreground max-w-xs text-center">
              La base non risponde. Puoi continuare in modalità offline o riprovare.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setBooting(false)}
                className="panel px-4 py-2 text-xs text-primary"
              >
                Continua comunque
              </button>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") window.location.reload();
                }}
                className="panel px-4 py-2 text-xs text-foreground"
              >
                Riprova
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center gap-8 px-6 py-10">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="relative">
          <img src="/icon-512.png" alt="" width={96} height={96} className="rounded-2xl glow-ring" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.45em] text-primary/80">// Accesso riservato</p>
        <h1 className="font-display text-3xl text-glow">007-PIKMIN</h1>
        <p className="text-sm text-muted-foreground">Inserisci il PIN agente</p>
      </motion.div>

      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={error ? { x: [-6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.35 }}
            className={`h-12 w-10 rounded-xl border ${
              pin.length > i
                ? "border-primary bg-primary/20 glow-soft"
                : "border-primary/30 bg-card/50"
            } flex items-center justify-center`}
          >
            <span className="text-primary text-glow font-display text-2xl">
              {pin.length > i ? "•" : ""}
            </span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-destructive text-sm flex items-center gap-2"
          >
            <Lock className="h-4 w-4" /> Accesso negato
          </motion.p>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
          k === "" ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              onClick={() => press(k)}
              className="h-16 rounded-2xl panel font-display text-2xl text-foreground active:scale-95 active:bg-primary/10 transition-transform flex items-center justify-center"
            >
              {k === "del" ? <Delete className="h-5 w-5 text-primary" /> : k}
            </button>
          ),
        )}
      </div>

      <p className="text-xs text-muted-foreground/70 text-center max-w-xs">
        PIN demo · Comandante <span className="text-primary">0077</span> · Lorenzo{" "}
        <span className="text-primary">1234</span>
      </p>
    </div>
  );
}
