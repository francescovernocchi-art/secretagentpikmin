import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, UserPlus, LogIn, Loader2 } from "lucide-react";
import {
  getSession,
  refreshSession,
  signInWithPassword,
  signUpWithPassword,
  type Role,
} from "@/lib/session";
import { IntroSequence } from "@/components/IntroSequence";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

const EMOJI_CHOICES = ["🕶️", "🧑", "👨", "👩", "🥷", "🛰️", "🐺", "🦊", "🤖", "🧑‍🚀"];

function LoginPage() {
  const navigate = useNavigate();
  const [intro, setIntro] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("lorenzo");
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
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
      if (mode === "signin") {
        const s = await signInWithPassword(email.trim(), password);
        if (!s) throw new Error("Profilo non trovato");
        toast.success(`Bentornato ${s.emoji ?? ""} ${s.name}`);
        navigate({ to: "/base" });
      } else {
        if (!name.trim()) throw new Error("Inserisci il nome agente");
        if (password.length < 8) throw new Error("Password troppo corta (min 8)");
        const s = await signUpWithPassword({
          email: email.trim(),
          password,
          name: name.trim(),
          role,
          emoji,
        });
        if (s) {
          toast.success(`Benvenuto ${emoji} ${name}`);
          navigate({ to: "/base" });
        } else {
          toast.info("Account creato. Controlla la mail per confermare e poi accedi.");
          setMode("signin");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Accesso negato: " + msg);
    } finally {
      setBusy(false);
    }
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
        <p className="text-sm text-muted-foreground">
          {mode === "signin" ? "Identificati, agente" : "Registra un nuovo agente"}
        </p>
      </motion.div>

      <div className="flex gap-2 panel p-1 rounded-full">
        <button
          onClick={() => setMode("signin")}
          className={`px-4 py-1.5 text-xs uppercase tracking-widest rounded-full ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Accedi
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`px-4 py-1.5 text-xs uppercase tracking-widest rounded-full ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Registra
        </button>
      </div>

      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-3">
        <AnimatePresence>
          {mode === "signup" && (
            <motion.div
              key="signup-extras"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome agente"
                className="panel px-4 py-3 bg-card/50 rounded-xl text-foreground placeholder:text-muted-foreground/60"
              />
              <div className="flex gap-2">
                {(["papa", "lorenzo"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 panel py-2 text-xs uppercase tracking-widest ${role === r ? "border-primary text-primary" : "text-muted-foreground"}`}
                  >
                    {r === "papa" ? "Comandante" : "Operativo"}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`h-10 w-10 rounded-xl panel text-xl ${emoji === e ? "border-primary glow-soft" : ""}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <label className="panel flex items-center gap-2 px-4 py-3 bg-card/50 rounded-xl">
          <Mail className="h-4 w-4 text-primary" />
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@famiglia"
            required
            className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground/60"
          />
        </label>

        <label className="panel flex items-center gap-2 px-4 py-3 bg-card/50 rounded-xl">
          <Lock className="h-4 w-4 text-primary" />
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={8}
            className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground/60"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="btn-neon mt-2 py-3 text-xs flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "signin" ? (
            <LogIn className="h-4 w-4" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {mode === "signin" ? "Entra nella base" : "Crea agente"}
        </button>
      </form>

      <p className="text-xs text-muted-foreground/70 text-center max-w-xs">
        Famiglia Pikmin · accesso protetto da email e password
      </p>
    </div>
  );
}
