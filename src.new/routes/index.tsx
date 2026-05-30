import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, LogIn, Loader2, User, Sparkles } from "lucide-react";
import {
  getSession,
  refreshSession,
  signInWithEmail,
  signInWithUsername,
} from "@/lib/session";
import { IntroSequence } from "@/components/IntroSequence";
import { enterDemoSession, shouldOfferDemoEntry, DEMO_AGENTS, isDemoModeActive } from "@/lib/demo-mode";
import { isSupabaseConfigured } from "@/lib/game/db";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [intro, setIntro] = useState(false);
  const [mode, setMode] = useState<"agent" | "commander">("agent");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    setShowDemo(shouldOfferDemoEntry());
  }, []);

  useEffect(() => {
    (async () => {
      if (getSession() && isDemoModeActive()) {
        navigate({ to: "/base" });
        return;
      }
      const s = await refreshSession().catch(() => null);
      if (s) {
        navigate({ to: "/base" });
        return;
      }
      if (getSession()) {
        navigate({ to: "/base" });
        return;
      }
      const seen = typeof window !== "undefined" && sessionStorage.getItem("pikmin.intro.seen");
      if (!seen) setIntro(true);
    })();
  }, [navigate]);

  const finishIntro = () => {
    try {
      sessionStorage.setItem("pikmin.intro.seen", "1");
    } catch {}
    setIntro(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const s =
        mode === "commander"
          ? await signInWithEmail(identifier.trim(), password)
          : await signInWithUsername(identifier, password);
      if (!s) throw new Error("Profilo non trovato");
      toast.success(`Bentornato ${s.emoji ?? ""} ${s.name}`);
      navigate({ to: "/base" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Accesso negato: " + msg);
    } finally {
      setBusy(false);
    }
  };

  const startDemo = (role: "papa" | "lorenzo") => {
    const s = enterDemoSession(role);
    toast.success(`Demo: benvenuto ${s.emoji ?? ""} ${s.name}`);
    navigate({ to: "/base" });
  };

  if (intro) return <IntroSequence onEnter={finishIntro} />;

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center gap-6 px-6 py-10">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-3"
      >
        <img src="/icon-512.png" alt="" width={88} height={88} className="rounded-2xl glow-ring" />
        <p className="text-[11px] uppercase tracking-[0.45em] text-primary/80">// Accesso riservato</p>
        <h1 className="font-display text-3xl text-glow">007-PIKMIN</h1>
        <p className="text-sm text-muted-foreground">Identificati, agente</p>
      </motion.div>

      <div className="flex gap-2 panel p-1 rounded-full">
        <button
          type="button"
          onClick={() => setMode("agent")}
          className={`px-4 py-1.5 text-xs uppercase tracking-widest rounded-full ${mode === "agent" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Agente
        </button>
        <button
          type="button"
          onClick={() => setMode("commander")}
          className={`px-4 py-1.5 text-xs uppercase tracking-widest rounded-full ${mode === "commander" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Comandante
        </button>
      </div>

      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-3">
        <label className="panel flex items-center gap-2 px-4 py-3 bg-card/50 rounded-xl">
          {mode === "commander" ? (
            <Mail className="h-4 w-4 text-primary" />
          ) : (
            <User className="h-4 w-4 text-primary" />
          )}
          <input
            type={mode === "commander" ? "email" : "text"}
            autoComplete={mode === "commander" ? "email" : "username"}
            value={identifier}
            onChange={(e) =>
              setIdentifier(
                mode === "commander" ? e.target.value : e.target.value.toLowerCase().replace(/\s/g, ""),
              )
            }
            placeholder={mode === "commander" ? "email@comando" : "nome agente"}
            required
            className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground/60"
          />
        </label>

        <label className="panel flex items-center gap-2 px-4 py-3 bg-card/50 rounded-xl">
          <Lock className="h-4 w-4 text-primary" />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground/60"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="btn-neon mt-2 py-3 text-xs flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Entra nella base
        </button>
      </form>

      <p className="text-xs text-muted-foreground/70 text-center max-w-xs">
        Famiglia Pikmin · accesso solo su invito del Comandante
      </p>

      {showDemo && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm market-card p-4 border-primary/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-[10px] uppercase tracking-widest text-primary/80">Demo giocabile</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {!isSupabaseConfigured()
              ? "Supabase non configurato — prova il gioco in locale con Francesco o Lorenzo."
              : "Entra in demo locale per mostrare scanner, market, villaggio e chat."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => startDemo("papa")}
              className="btn-neon py-2.5 text-[10px] uppercase tracking-wider"
            >
              {DEMO_AGENTS.papa.emoji} Francesco
            </button>
            <button
              type="button"
              onClick={() => startDemo("lorenzo")}
              className="btn-neon py-2.5 text-[10px] uppercase tracking-wider"
            >
              {DEMO_AGENTS.lorenzo.emoji} Lorenzo
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
