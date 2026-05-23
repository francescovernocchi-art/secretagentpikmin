import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { hapticTap } from "@/lib/haptic";
import { sfx } from "@/lib/sfx";
import { getSession } from "@/lib/session";
import { getCoins } from "@/lib/coins";
import { supabase } from "@/integrations/supabase/client";
import {
  BaseBuilding,
  BuildingCatalog,
  buildingStage,
  completeBuilding,
  costForLevel,
  fetchCatalog,
  formatRemaining,
  listBuildings,
  startBuilding,
  startUpgrade,
} from "@/lib/base";
import { ArrowLeft, ArrowUpRight, Hammer, Lock, Sparkles, Star } from "lucide-react";

export const Route = createFileRoute("/villaggio/edifici")({
  component: EdificiPage,
  head: () => ({
    meta: [
      { title: "Edifici del Villaggio · Buff e potenziamenti" },
      { name: "description", content: "Sfoglia, costruisci ed evolvi gli edifici del villaggio Pikmin." },
    ],
  }),
});

const BONUS_LABELS: Record<string, string> = {
  ingredient_per_hour: "Ingredienti/ora",
  radar_range_m: "Raggio radar (m)",
  trade_slots: "Slot scambio",
  trade_discount_pct: "Sconto scambi (%)",
  defense: "Difesa villaggio",
  pikmin_capacity: "Capienza Pikmin",
  storage: "Capienza magazzino",
  xp_bonus: "Bonus XP",
};

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  utility: { label: "Utility", color: "#94a3b8" },
  production: { label: "Produzione", color: "#a8e063" },
  defense: { label: "Difesa", color: "#f87171" },
  social: { label: "Sociale", color: "#a78bfa" },
  exploration: { label: "Esplorazione", color: "#7ec0e8" },
};

function EdificiPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role ?? "lorenzo";

  const [catalog, setCatalog] = useState<BuildingCatalog[]>([]);
  const [buildings, setBuildings] = useState<BaseBuilding[]>([]);
  const [coins, setCoins] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [tick, setTick] = useState(0);
  void tick;

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const reload = async () => {
    const [c, b, m] = await Promise.all([fetchCatalog(), listBuildings(agent), getCoins(agent)]);
    setCatalog(c);
    setBuildings(b);
    setCoins(m);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("edifici:" + agent)
      .on("postgres_changes", { event: "*", schema: "public", table: "base_buildings", filter: `agent=eq.${agent}` }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  const categories = ["all", ...Array.from(new Set(catalog.map((c) => c.category)))];
  const filtered = filter === "all" ? catalog : catalog.filter((c) => c.category === filter);
  const byKey = (k: string) => buildings.find((b) => b.type === k);

  return (
    <PageShell
      title="Edifici"
      subtitle="Catalogo completo dei buff del villaggio"
      action={
        <div className="flex items-center gap-2">
          <span className="panel px-2 py-1 text-[11px] flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" /> {coins}
          </span>
          <Link to="/villaggio" onClick={hapticTap} className="panel px-2 py-1 text-[11px] flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Villaggio
          </Link>
        </div>
      }
    >
      {/* Filtri categoria */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {categories.map((c) => {
          const meta = c === "all" ? { label: "Tutti", color: "#fff" } : CATEGORY_META[c] ?? { label: c, color: "#fff" };
          const active = filter === c;
          return (
            <button
              key={c}
              onClick={() => {
                hapticTap();
                setFilter(c);
              }}
              className={`shrink-0 panel px-3 py-1.5 text-[11px] uppercase tracking-widest ${active ? "ring-2 ring-primary" : ""}`}
              style={{ color: active ? meta.color : undefined }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Lista edifici */}
      <div className="space-y-3">
        {filtered.map((c) => {
          const owned = byKey(c.key);
          const isBuilding = owned && owned.status !== "idle";
          const level = owned?.level ?? 0;
          const isMax = level >= c.max_level;
          const nextCost = !isMax ? costForLevel(c, level + 1) : null;
          const stage = buildingStage(level);
          const catMeta = CATEGORY_META[c.category] ?? { label: c.category, color: "#fff" };

          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel-strong p-3 space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <span className="text-4xl drop-shadow-md">{c.emoji}</span>
                  {stage === "maestro" && (
                    <motion.span
                      className="absolute -inset-2 rounded-full"
                      style={{ background: "radial-gradient(circle, #fde68a55, transparent 70%)" }}
                      animate={{ opacity: [0.4, 0.9, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-base">{c.name}</h3>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-widest border"
                      style={{ borderColor: `${catMeta.color}66`, color: catMeta.color }}
                    >
                      {catMeta.label}
                    </span>
                    {owned ? (
                      <span className="text-[10px] text-primary">Lv {level}/{c.max_level} · {stage}</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Non costruito
                      </span>
                    )}
                  </div>
                  {c.description && <p className="text-[11px] text-muted-foreground mt-1">{c.description}</p>}
                </div>
              </div>

              {/* Barra livello */}
              {owned && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: c.max_level }).map((_, i) => (
                    <span
                      key={i}
                      className={`flex-1 h-1.5 rounded-full ${i < level ? "bg-primary" : "bg-night/60 border border-primary/20"}`}
                    />
                  ))}
                </div>
              )}

              {/* BUFF per livello — tabella sintetica */}
              <div className="rounded-lg bg-night/60 border border-primary/15 p-2.5 space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-1">
                  <Star className="h-3 w-3" /> Buff
                </p>
                {Object.entries(c.bonus_per_level ?? {}).length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Edificio decorativo.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(c.bonus_per_level).map(([k, v]) => {
                      const cur = level * Number(v);
                      const max = c.max_level * Number(v);
                      return (
                        <div key={k} className="rounded-md bg-night/70 px-2 py-1.5 border border-primary/10">
                          <p className="text-[10px] text-muted-foreground">{BONUS_LABELS[k] ?? k}</p>
                          <p className="text-xs">
                            <span className="text-primary font-semibold">+{cur}</span>
                            <span className="text-muted-foreground"> / max +{max}</span>
                          </p>
                          <p className="text-[9px] text-muted-foreground">+{v} per livello</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AZIONE — costruisci / evolvi / in corso */}
              {isBuilding ? (
                <div className="rounded-lg bg-primary/10 border border-primary/30 p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-primary">In costruzione</p>
                  <p className="font-display text-lg text-glow">{formatRemaining(owned!.build_end_at)}</p>
                  <button
                    className="mt-1 text-[10px] underline text-muted-foreground"
                    onClick={async () => {
                      await completeBuilding(owned!);
                      reload();
                    }}
                  >
                    Verifica completamento
                  </button>
                </div>
              ) : isMax ? (
                <div className="rounded-lg bg-night/60 border border-primary/30 p-2 text-center text-xs text-primary">
                  ⭐ Livello massimo raggiunto
                </div>
              ) : nextCost ? (
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <div className="text-[11px] space-y-0.5">
                    <p className="text-muted-foreground">
                      Prossimo Lv {level + 1}:{" "}
                      <span className="text-foreground">{nextCost.coins} 💰</span> · {nextCost.minutes} min
                    </p>
                    {nextCost.ingredients.length > 0 && (
                      <p className="text-muted-foreground">Ingredienti: {nextCost.ingredients.join(", ")}</p>
                    )}
                  </div>
                  <button
                    disabled={coins < nextCost.coins}
                    onClick={async () => {
                      hapticTap();
                      try {
                        if (!owned) {
                          await startBuilding(agent, c, { x: 20 + Math.random() * 60, y: 10 + Math.random() * 45 });
                          sfx.build();
                        } else {
                          await startUpgrade(agent, owned, c);
                          sfx.upgrade();
                        }
                        reload();
                      } catch (e: any) {
                        alert(e.message);
                      }
                    }}
                    className="btn-neon px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    {owned ? <ArrowUpRight className="h-3 w-3" /> : <Hammer className="h-3 w-3" />}
                    {owned ? "Evolvi" : "Costruisci"}
                  </button>
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
