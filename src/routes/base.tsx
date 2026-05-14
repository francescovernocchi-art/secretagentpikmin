import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession, clearSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { Radar } from "@/components/Radar";
import { Battery, MessageSquare, Target, Trophy, LogOut, ShieldCheck, Backpack } from "lucide-react";

export const Route = createFileRoute("/base")({
  component: BasePage,
});

function BasePage() {
  const navigate = useNavigate();
  const session = typeof window !== "undefined" ? getSession() : null;
  const [stats, setStats] = useState({ activeMissions: 0, xp: 0, lastMessage: "", badges: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: missions }, { data: messages }, { data: rewards }] = await Promise.all([
        supabase.from("missions").select("*"),
        supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(1),
        supabase.from("rewards").select("*"),
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
    })();
  }, []);

  const level = Math.max(1, Math.floor(stats.xp / 50) + 1);
  const energy = Math.min(100, 40 + stats.activeMissions * 12 + stats.badges * 4);

  return (
    <PageShell
      title={`Ciao, ${session?.name ?? "Agente"}`}
      subtitle="Base segreta · stato operativo"
      action={
        <button
          onClick={() => {
            clearSession();
            navigate({ to: "/" });
          }}
          className="panel px-3 py-2 text-xs flex items-center gap-1 text-muted-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Esci
        </button>
      }
    >
      {/* Hero card team */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="panel-strong relative overflow-hidden p-5"
      >
        <div className="absolute -right-6 -top-6 opacity-30">
          <Radar size={140} />
        </div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">Squadra Operativa</p>
        <h2 className="font-display text-2xl text-glow mt-1">Papà & Lorenzo Team</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Connessi · Base attiva · Missione condivisa in corso.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Livello" value={`Lv ${level}`} />
          <Stat label="XP" value={String(stats.xp)} />
          <Stat label="Energia" value={`${energy}%`} />
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <TileLink to="/missioni" icon={<Target className="h-5 w-5" />} label="Missioni attive" value={stats.activeMissions} />
        <TileLink to="/premi" icon={<Trophy className="h-5 w-5" />} label="Badge" value={stats.badges} />
        <TileLink to="/chat" icon={<MessageSquare className="h-5 w-5" />} label="Ultimo messaggio" value={stats.lastMessage} small />
        <TileLink to="/radar" icon={<Battery className="h-5 w-5" />} label="Radar Pikmin" value="Online" />
      </div>

      {session?.role === "papa" && (
        <Link to="/missioni" className="panel flex items-center gap-3 p-4">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-night/60 border border-primary/15 p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-lg text-primary text-glow mt-1">{value}</p>
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
    <Link to={to} className="panel p-4 flex flex-col gap-2 active:scale-[0.98] transition-transform">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span></div>
      <p className={small ? "text-sm text-foreground/90 line-clamp-2" : "font-display text-2xl text-glow"}>
        {value}
      </p>
    </Link>
  );
}
