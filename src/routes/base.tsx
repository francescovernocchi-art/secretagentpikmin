import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession, clearSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { Radar } from "@/components/Radar";
import { PikminCounter } from "@/components/PikminCounter";
import { hapticScan, hapticTap } from "@/lib/haptic";
import {
  Battery,
  MessageSquare,
  Target,
  Trophy,
  LogOut,
  ShieldCheck,
  Backpack,
  Map,
  Rocket,
  ScanLine,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/base")({
  component: BasePage,
});

interface AgentLite {
  name: string;
  emoji: string;
  role: string;
  updated_at: string;
}

function BasePage() {
  const navigate = useNavigate();
  const session = typeof window !== "undefined" ? getSession() : null;
  const [stats, setStats] = useState({ activeMissions: 0, xp: 0, lastMessage: "", badges: 0 });
  const [agents, setAgents] = useState<AgentLite[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: missions }, { data: messages }, { data: rewards }, { data: positions }] =
        await Promise.all([
          supabase.from("missions").select("*"),
          supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(1),
          supabase.from("rewards").select("*"),
          supabase
            .from("agent_positions")
            .select("agent_name,emoji,role,updated_at")
            .order("updated_at", { ascending: false })
            .limit(4),
        ]);
      const xp = (missions ?? [])
        .filter((m) => m.status === "approvata")
        .reduce((acc, m) => acc + (m.xp ?? 0), 0);
      setStats({
        activeMissions: (missions ?? []).filter((m) => m.status !== "approvata").length,
        xp,
        lastMessage: messages?.[0]?.content ?? "Nessun messaggio ancora.",
        badges: rewards?.length ?? 0,
      });
      setAgents(
        (positions ?? []).map((p) => ({
          name: p.agent_name,
          emoji: p.emoji ?? "🕵️",
          role: p.role,
          updated_at: p.updated_at,
        })),
      );
    })();
  }, []);

  const level = Math.max(1, Math.floor(stats.xp / 50) + 1);
  const energy = Math.min(100, 40 + stats.activeMissions * 12 + stats.badges * 4);

  const handleScan = () => {
    hapticScan();
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      navigate({ to: "/radar" });
    }, 1200);
  };

  return (
    <PageShell
      title={`Ciao, ${session?.name ?? "Agente"}`}
      subtitle="Base segreta · stato operativo"
      action={
        <div className="flex items-center gap-2">
          <PikminCounter compact />
          <button
            onClick={() => {
              hapticTap();
              clearSession();
              navigate({ to: "/" });
            }}
            className="panel px-2.5 py-1.5 text-[10px] flex items-center gap-1 text-muted-foreground"
          >
            <LogOut className="h-3 w-3" /> Esci
          </button>
        </div>
      }
    >
      {/* HERO: radar centrale cinematografico */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="panel-strong relative overflow-hidden p-5"
      >
        <span className="hud-corner tl" />
        <span className="hud-corner tr" />
        <span className="hud-corner bl" />
        <span className="hud-corner br" />

        <div className="flex flex-col items-center gap-3">
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">// Squadra operativa</p>
          <div className="relative">
            <Radar size={210} />
            {scanning && (
              <motion.div
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border-2 border-primary"
              />
            )}
          </div>
          <h2 className="font-display text-xl text-glow text-center">PAPÀ × LORENZO TEAM</h2>
          <p className="text-xs text-muted-foreground text-center">
            Uplink attivo · canale sicuro · missione condivisa
          </p>

          <button
            onClick={handleScan}
            disabled={scanning}
            className="btn-neon mt-2 px-6 py-3 text-xs flex items-center gap-2 disabled:opacity-60"
          >
            <ScanLine className={`h-4 w-4 ${scanning ? "animate-pulse" : ""}`} />
            {scanning ? "Scansione in corso…" : "Scansiona Pikmin"}
          </button>

          <div className="mt-3 grid grid-cols-3 gap-3 w-full">
            <Stat label="Livello" value={`Lv ${level}`} />
            <Stat label="XP" value={String(stats.xp)} />
            <Stat label="Energia" value={`${energy}%`} bar={energy} />
          </div>
        </div>
      </motion.div>

      {/* AGENTI COLLEGATI */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 flex items-center gap-1.5">
            <Users className="h-3 w-3" /> Agenti collegati
          </p>
          <Link to="/chat" onClick={hapticTap} className="text-[10px] text-primary uppercase tracking-widest">
            Canale →
          </Link>
        </div>
        {agents.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessun agente rilevato di recente.</p>
        ) : (
          <ul className="space-y-2">
            {agents.map((a) => {
              const mins = Math.max(0, Math.floor((Date.now() - new Date(a.updated_at).getTime()) / 60000));
              const live = mins < 5;
              return (
                <li key={a.name + a.updated_at} className="flex items-center gap-3">
                  <span className="text-lg">{a.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{a.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {a.role === "papa" ? "Comandante" : "Agente"} · {live ? "live" : `${mins}m fa`}
                    </p>
                  </div>
                  <span
                    className={`h-2 w-2 rounded-full ${live ? "bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]" : "bg-muted-foreground/40"}`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* GRIGLIA GADGET */}
      <div className="grid grid-cols-2 gap-3">
        <TileLink to="/missioni" icon={<Target className="h-5 w-5" />} label="Missioni attive" value={stats.activeMissions} />
        <TileLink to="/premi" icon={<Trophy className="h-5 w-5" />} label="Badge condivisi" value={stats.badges} />
        <TileLink to="/mappa" icon={<Map className="h-5 w-5" />} label="Mappa tattica" value="Live" />
        <TileLink to="/navicella" icon={<Rocket className="h-5 w-5" />} label="Navicella" value="Cantiere" />
        <TileLink to="/chat" icon={<MessageSquare className="h-5 w-5" />} label="Ultimo messaggio" value={stats.lastMessage} small />
        <TileLink to="/inventario" icon={<Backpack className="h-5 w-5" />} label="Inventario" value="Sacca" />
      </div>

      {session?.role === "papa" && (
        <Link
          to="/missioni"
          onClick={hapticTap}
          className="panel-strong relative flex items-center gap-3 p-4 overflow-hidden"
        >
          <span className="hud-corner tl" />
          <span className="hud-corner br" />
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Area Comandante</p>
            <p className="text-xs text-muted-foreground">Crea, approva e premia missioni</p>
          </div>
          <span className="text-primary text-xs">Apri →</span>
        </Link>
      )}
    </PageShell>
  );
}

function Stat({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div className="relative rounded-xl bg-night/60 border border-primary/15 p-3 text-center overflow-hidden">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-lg text-primary text-glow mt-1">{value}</p>
      {typeof bar === "number" && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-primary glow-soft" style={{ width: `${bar}%` }} />
      )}
    </div>
  );
}

function TileLink({
  to,
  icon,
  label,
  value,
  small,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={hapticTap}
      className="panel relative p-4 flex flex-col gap-2 active:scale-[0.98] transition-transform overflow-hidden group"
    >
      <span className="hud-corner tl" />
      <span className="hud-corner br" />
      <div className="flex items-center gap-2 text-primary">
        <span className="transition-transform group-hover:scale-110">{icon}</span>
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className={small ? "text-sm text-foreground/90 line-clamp-2" : "font-display text-2xl text-glow"}>
        {value}
      </p>
    </Link>
  );
}
