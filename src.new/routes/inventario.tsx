import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { Backpack, FlaskConical, Sparkles } from "lucide-react";

export const Route = createFileRoute("/inventario")({
  component: InventarioPage,
});

interface Ingredient {
  key: string;
  name: string;
  emoji: string;
  rarity: string;
  color: string | null;
  source: string;
}
interface InvRow {
  id: string;
  ingredient_key: string;
  qty: number;
  updated_at: string;
}

const RARITY_ORDER = ["epica", "rara", "comune"] as const;
const RARITY_LABEL: Record<string, string> = {
  comune: "Comune",
  rara: "Rara",
  epica: "Epica",
};
const RARITY_STYLE: Record<string, string> = {
  comune: "border-primary/30 bg-night/60",
  rara: "border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_18px_-6px_hsl(190_90%_60%/0.6)]",
  epica:
    "border-fuchsia-400/50 bg-fuchsia-500/10 shadow-[0_0_22px_-4px_hsl(300_90%_70%/0.7)]",
};
const RARITY_BADGE: Record<string, string> = {
  comune: "text-muted-foreground",
  rara: "text-cyan-300",
  epica: "text-fuchsia-300",
};

function InventarioPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role === "papa" ? "papa" : "lorenzo";

  const [catalog, setCatalog] = useState<Record<string, Ingredient>>({});
  const [inventory, setInventory] = useState<InvRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    const [{ data: ing }, { data: inv }] = await Promise.all([
      supabase.from("ingredients").select("*"),
      supabase.from("inventory").select("*").eq("agent", agent),
    ]);
    const map: Record<string, Ingredient> = {};
    for (const i of (ing ?? []) as Ingredient[]) map[i.key] = i;
    setCatalog(map);
    setInventory((inv ?? []) as InvRow[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("inventario-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(
    () =>
      inventory
        .map((r) => ({ ...r, meta: catalog[r.ingredient_key] }))
        .filter((r) => r.meta),
    [inventory, catalog],
  );

  const totals = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + r.qty, 0);
    const uniqueCatalog = Object.keys(catalog).length;
    const collected = rows.length;
    return { totalQty, collected, uniqueCatalog };
  }, [rows, catalog]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof rows> = {};
    for (const r of rows) {
      const k = r.meta!.rarity || "comune";
      (g[k] ||= []).push(r);
    }
    for (const k of Object.keys(g)) {
      g[k].sort((a, b) => b.qty - a.qty || a.meta!.name.localeCompare(b.meta!.name));
    }
    return g;
  }, [rows]);

  const sel = selected ? rows.find((r) => r.ingredient_key === selected) : null;

  return (
    <PageShell
      title="Inventario"
      subtitle="Ingredienti catturati · pronti per il Lab"
      action={
        <Link to="/lab" className="panel px-3 py-2 text-xs flex items-center gap-1">
          <FlaskConical className="h-3.5 w-3.5" /> Lab
        </Link>
      }
    >
      {/* Stat header */}
      <div className="panel-strong scanline relative overflow-hidden p-5">
        <div className="absolute -right-4 -top-4 opacity-30">
          <Backpack size={120} />
        </div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">
          // Sacca operativa
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Pezzi" value={String(totals.totalQty)} />
          <Stat label="Tipi" value={String(totals.collected)} />
          <Stat
            label="Catalogo"
            value={`${totals.collected}/${totals.uniqueCatalog || "—"}`}
          />
        </div>
      </div>

      {/* Vuoto */}
      {rows.length === 0 ? (
        <div className="panel p-6 text-center text-xs text-muted-foreground space-y-2">
          <Sparkles className="h-5 w-5 text-primary mx-auto opacity-70" />
          <p>Sacca vuota.</p>
          <p>
            Aggancia bersagli con il{" "}
            <Link to="/radar" className="text-primary underline">
              Radar Pikmin
            </Link>{" "}
            per raccogliere ingredienti.
          </p>
        </div>
      ) : (
        RARITY_ORDER.filter((r) => grouped[r]?.length).map((rarity) => (
          <section key={rarity}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {RARITY_LABEL[rarity]}
              </p>
              <p className={`text-[10px] uppercase tracking-widest ${RARITY_BADGE[rarity]}`}>
                {grouped[rarity].length} tipi ·{" "}
                {grouped[rarity].reduce((s, r) => s + r.qty, 0)} pz
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {grouped[rarity].map((row) => {
                const m = row.meta!;
                const isSel = selected === m.key;
                return (
                  <motion.button
                    key={row.id}
                    layout
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setSelected(isSel ? null : m.key)}
                    className={`relative rounded-xl border p-3 flex flex-col items-center gap-1 transition-all ${
                      RARITY_STYLE[m.rarity] ?? RARITY_STYLE.comune
                    } ${isSel ? "ring-2 ring-primary" : ""}`}
                  >
                    <span className="text-3xl leading-none">{m.emoji}</span>
                    <span className="text-[10px] text-center leading-tight line-clamp-2">
                      {m.name}
                    </span>
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full font-bold">
                      ×{row.qty}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* Dettaglio */}
      {sel && sel.meta && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-strong p-4 flex items-center gap-4"
        >
          <div
            className={`h-16 w-16 rounded-2xl border flex items-center justify-center text-4xl ${
              RARITY_STYLE[sel.meta.rarity] ?? RARITY_STYLE.comune
            }`}
          >
            {sel.meta.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base text-glow truncate">{sel.meta.name}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              {RARITY_LABEL[sel.meta.rarity] ?? "Comune"} · fonte:{" "}
              {sel.meta.source === "radar" ? "Radar" : "Missione"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Disponibili: <span className="text-primary text-glow">×{sel.qty}</span> ·
              chiave <span className="font-mono">{sel.meta.key}</span>
            </p>
          </div>
        </motion.div>
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
