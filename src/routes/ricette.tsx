import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { consumeIngredient } from "@/lib/ingredients";
import { BookOpen, FlaskConical, Sparkles, Check, X, Search } from "lucide-react";

export const Route = createFileRoute("/ricette")({
  component: RecipesPage,
});

interface Ingredient {
  key: string;
  name: string;
  emoji: string;
  rarity: string;
}
interface InvRow {
  ingredient_key: string;
  qty: number;
}
interface Recipe {
  id: string;
  input_a: string | null;
  input_b: string | null;
  inputs: string[] | null;
  result_name: string;
  result_emoji: string;
  description: string | null;
  xp: number;
}
interface Discovery {
  id: string;
  result_name: string;
  result_emoji: string;
  description: string | null;
  xp: number;
  is_ai: boolean;
  created_at: string;
}

const recipeKeys = (r: Recipe): string[] =>
  r.inputs && r.inputs.length
    ? r.inputs
    : ([r.input_a, r.input_b].filter(Boolean) as string[]);

function RecipesPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role === "papa" ? "papa" : "lorenzo";

  const [catalog, setCatalog] = useState<Record<string, Ingredient>>({});
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InvRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "ready">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Discovery | null>(null);

  const load = async () => {
    const [{ data: ing }, { data: rec }, { data: inv }] = await Promise.all([
      supabase.from("ingredients").select("key, name, emoji, rarity"),
      supabase.from("recipes").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory").select("ingredient_key, qty").eq("agent", agent),
    ]);
    const map: Record<string, Ingredient> = {};
    for (const i of (ing ?? []) as Ingredient[]) map[i.key] = i;
    setCatalog(map);
    setRecipes((rec ?? []) as Recipe[]);
    setInventory((inv ?? []) as InvRow[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("ricette-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recipes" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const have = (key: string) =>
    inventory.find((i) => i.ingredient_key === key)?.qty ?? 0;

  const annotated = useMemo(() => {
    return recipes.map((r) => {
      const keys = recipeKeys(r);
      const need: Record<string, number> = {};
      for (const k of keys) need[k] = (need[k] ?? 0) + 1;
      const items = Object.entries(need).map(([k, n]) => ({
        key: k,
        need: n,
        own: have(k),
        meta: catalog[k],
      }));
      const ready = items.every((it) => it.own >= it.need);
      const known = items.every((it) => it.meta);
      return { recipe: r, keys, items, ready, known };
    });
  }, [recipes, inventory, catalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return annotated.filter(({ recipe, items, ready }) => {
      if (filter === "ready" && !ready) return false;
      if (!q) return true;
      if (recipe.result_name.toLowerCase().includes(q)) return true;
      return items.some((it) => it.meta?.name.toLowerCase().includes(q));
    });
  }, [annotated, query, filter]);

  const prepare = async (entry: (typeof annotated)[number]) => {
    const { recipe, items, ready } = entry;
    if (!ready || busyId) return;
    setBusyId(recipe.id);
    try {
      // Consuma esattamente le quantità richieste
      for (const it of items) {
        for (let i = 0; i < it.need; i++) {
          await consumeIngredient(agent, it.key);
        }
      }

      // Crea scoperta (non AI: ricetta nota)
      const inputs = entry.keys;
      const { data: saved } = await supabase
        .from("discoveries")
        .insert({
          agent,
          input_a: inputs[0],
          input_b: inputs[1] ?? inputs[0],
          inputs,
          result_name: recipe.result_name,
          result_emoji: recipe.result_emoji,
          description: recipe.description,
          xp: recipe.xp,
          is_ai: false,
        })
        .select()
        .single();

      // Badge
      await supabase.from("rewards").insert({
        agent,
        badge: "lab",
        title: recipe.result_name,
        icon: recipe.result_emoji,
      });

      if (saved) setFlash(saved as Discovery);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageShell
      title="Ricettario"
      subtitle="Ricette note · prepara con un tocco"
      action={
        <Link to="/lab" className="panel px-3 py-2 text-xs flex items-center gap-1">
          <FlaskConical className="h-3.5 w-3.5" /> Lab
        </Link>
      }
    >
      {/* Stat header + filtri */}
      <div className="panel-strong scanline relative overflow-hidden p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">
              {recipes.length} ricette · {annotated.filter((a) => a.ready).length} pronte
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca ricetta o ingrediente…"
            maxLength={60}
            className="w-full bg-night/60 border border-primary/20 rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
            Tutte
          </FilterPill>
          <FilterPill active={filter === "ready"} onClick={() => setFilter("ready")}>
            Solo pronte
          </FilterPill>
        </div>
      </div>

      {/* Lista ricette */}
      {filtered.length === 0 ? (
        <div className="panel p-6 text-center text-xs text-muted-foreground space-y-2">
          <Sparkles className="h-5 w-5 text-primary mx-auto opacity-70" />
          <p>
            {recipes.length === 0
              ? "Nessuna ricetta nota. Sperimenta nel Lab o chiedi a papà di aggiungerne!"
              : "Nessuna ricetta corrisponde al filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <RecipeCard
              key={entry.recipe.id}
              entry={entry}
              busy={busyId === entry.recipe.id}
              onPrepare={() => prepare(entry)}
            />
          ))}
        </div>
      )}

      {/* Flash risultato */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFlash(null)}
            className="fixed inset-0 z-50 bg-night/85 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="panel-strong p-8 text-center max-w-xs glow-soft"
            >
              <Sparkles className="h-5 w-5 text-primary mx-auto mb-2 animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">
                // Ricetta completata!
              </p>
              <p className="text-7xl mt-3">{flash.result_emoji}</p>
              <p className="font-display text-xl text-glow mt-2">{flash.result_name}</p>
              {flash.description && (
                <p className="text-xs text-muted-foreground mt-2">{flash.description}</p>
              )}
              <p className="font-display text-2xl text-primary text-glow mt-3">
                +{flash.xp} XP
              </p>
              <button onClick={() => setFlash(null)} className="btn-neon mt-5 px-5 py-2 text-xs">
                Continua
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

interface AnnotatedItem {
  key: string;
  need: number;
  own: number;
  meta: Ingredient | undefined;
}

function RecipeCard({
  entry,
  busy,
  onPrepare,
}: {
  entry: { recipe: Recipe; items: AnnotatedItem[]; ready: boolean; known: boolean };
  busy: boolean;
  onPrepare: () => void;
}) {
  const { recipe, items, ready, known } = entry;
  return (
    <motion.div
      layout
      className={`panel p-3 space-y-3 ${ready ? "ring-1 ring-primary/40" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl border border-primary/30 bg-night/60 flex items-center justify-center text-3xl">
          {recipe.result_emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base text-glow truncate">{recipe.result_name}</p>
          {recipe.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2">
              {recipe.description}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-primary text-glow font-display text-sm">+{recipe.xp}</p>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">XP</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => {
          const ok = it.own >= it.need;
          return (
            <span
              key={it.key}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                ok
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              <span className="text-base leading-none">{it.meta?.emoji ?? "❔"}</span>
              <span className="truncate max-w-[6rem]">
                {it.meta?.name ?? it.key}
              </span>
              <span className="font-mono opacity-80">
                {it.own}/{it.need}
              </span>
              {ok ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <X className="h-3 w-3 text-destructive" />
              )}
            </span>
          );
        })}
      </div>

      <button
        onClick={onPrepare}
        disabled={!ready || !known || busy}
        className="btn-neon w-full py-2 text-xs flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <FlaskConical className="h-3.5 w-3.5" />
        {busy ? "Preparazione…" : ready ? "Prepara ricetta" : "Ingredienti mancanti"}
      </button>
    </motion.div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg py-2 text-xs border transition-colors ${
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-primary/15 bg-night/40 text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
