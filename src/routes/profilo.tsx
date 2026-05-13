import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSession, clearSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { LogOut, Shield } from "lucide-react";

export const Route = createFileRoute("/profilo")({
  component: ProfiloPage,
});

function ProfiloPage() {
  const navigate = useNavigate();
  const session = typeof window !== "undefined" ? getSession() : null;
  const [stats, setStats] = useState({ xp: 0, missions: 0, badges: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: missions }, { data: rewards }] = await Promise.all([
        supabase.from("missions").select("xp,status"),
        supabase.from("rewards").select("id"),
      ]);
      const xp = (missions ?? [])
        .filter((m) => m.status === "approvata")
        .reduce((a, m) => a + (m.xp ?? 0), 0);
      setStats({
        xp,
        missions: (missions ?? []).filter((m) => m.status === "approvata").length,
        badges: rewards?.length ?? 0,
      });
    })();
  }, []);

  const level = Math.max(1, Math.floor(stats.xp / 50) + 1);
  const next = level * 50;
  const progress = Math.min(100, (stats.xp / next) * 100);

  return (
    <PageShell title="Profilo Agente" subtitle="Dossier riservato">
      <div className="panel-strong p-5 flex flex-col items-center text-center gap-3">
        <div className="relative">
          <img src="/icon-512.png" alt="" width={96} height={96} className="rounded-2xl glow-ring" />
          <span className="absolute -bottom-2 -right-2 panel px-2 py-0.5 text-[10px] font-display text-primary">
            Lv {level}
          </span>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">// Codename</p>
          <h2 className="font-display text-2xl text-glow">{session?.name ?? "Agente"}</h2>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-center">
            <Shield className="h-3 w-3 text-primary" />
            {session?.role === "papa" ? "Comandante della Base" : "Agente sul campo"}
          </p>
        </div>

        <div className="w-full mt-2">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <span>{stats.xp} XP</span><span>{next} XP</span>
          </div>
          <div className="h-2 rounded-full bg-night/80 overflow-hidden border border-primary/20">
            <div className="h-full bg-primary glow-soft" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Missioni" value={stats.missions} />
        <Stat label="Badge" value={stats.badges} />
        <Stat label="XP" value={stats.xp} />
      </div>

      <button
        onClick={() => {
          clearSession();
          navigate({ to: "/" });
        }}
        className="panel w-full p-4 flex items-center justify-center gap-2 text-destructive"
      >
        <LogOut className="h-4 w-4" /> Disconnetti agente
      </button>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-xl text-primary text-glow mt-1">{value}</p>
    </div>
  );
}
