import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { Plus, Trophy } from "lucide-react";
import { PIKMIN } from "@/assets/pikmin";

export const Route = createFileRoute("/premi")({
  component: PremiPage,
});

interface Reward {
  id: string;
  agent: string;
  badge: string;
  title: string;
  icon: string | null;
  created_at: string;
}

const PRESETS = [
  { title: "Pikmin Rosso Catturato", icon: "pikmin:red", badge: "red" },
  { title: "Pikmin Giallo Catturato", icon: "pikmin:yellow", badge: "yellow" },
  { title: "Pikmin Blu Catturato", icon: "pikmin:blue", badge: "blue" },
  { title: "Pikmin Roccia Catturato", icon: "pikmin:rock", badge: "rock" },
];

const PIKMIN_MAP: Record<string, string> = {
  "pikmin:red": PIKMIN.red,
  "pikmin:yellow": PIKMIN.yellow,
  "pikmin:blue": PIKMIN.blue,
  "pikmin:white": PIKMIN.white,
  "pikmin:rock": PIKMIN.rock,
  "pikmin:pink": PIKMIN.pink,
};

function PremiPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const isAdmin = session?.role === "papa";
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    supabase
      .from("rewards")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRewards((data ?? []) as Reward[]));
  }, []);

  const grant = async (p: typeof PRESETS[number]) => {
    const { data } = await supabase.from("rewards").insert({ ...p, agent: "lorenzo" }).select().single();
    if (data) setRewards((r) => [data as Reward, ...r]);
  };

  return (
    <PageShell title="Premi & Badge" subtitle="Onorificenze segrete">
      <div className="panel-strong p-4 flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary text-glow" />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Totale</p>
          <p className="font-display text-2xl text-glow">{rewards.length} medaglie</p>
        </div>
      </div>

      {isAdmin && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Assegna premio</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button key={p.title} onClick={() => grant(p)} className="panel p-3 text-left flex items-center gap-2">
                <img src={PIKMIN_MAP[p.icon]} alt="" className="h-8 w-8 object-contain" />
                <span className="text-sm">{p.title}</span>
                <Plus className="h-4 w-4 ml-auto text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {rewards.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="panel p-4 flex flex-col items-center text-center gap-2 glow-soft"
          >
            {r.icon && PIKMIN_MAP[r.icon] ? (
              <img src={PIKMIN_MAP[r.icon]} alt="" className="h-16 w-16 object-contain animate-float-slow drop-shadow-[0_0_12px_oklch(0.86_0.24_145/0.5)]" />
            ) : (
              <span className="text-4xl animate-float-slow">{r.icon ?? "🏅"}</span>
            )}
            <p className="font-display text-sm text-glow">{r.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString("it-IT")}
            </p>
          </motion.div>
        ))}
        {rewards.length === 0 && (
          <p className="col-span-2 text-center text-xs text-muted-foreground py-10">
            Nessun premio ancora. Completa missioni per sbloccarli.
          </p>
        )}
      </div>
    </PageShell>
  );
}
