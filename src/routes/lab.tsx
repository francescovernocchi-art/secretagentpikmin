import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { consumeIngredient, grantIngredients } from "@/lib/ingredients";
import { inventDiscovery } from "@/lib/lab.functions";
import { FlaskConical, Sparkles, X, Plus, BookPlus } from "lucide-react";

export const Route = createFileRoute("/lab")({
  component: LabPage,
});

interface Ingredient {
  key: string;
  name: string;
  emoji: string;
  rarity: string;
  color: string | null;
}
interface InvRow {
  id: string;
  ingredient_key: string;
  qty: number;
}
interface Recipe {
  id: string;
  input_a: string;
  input_b: string;
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

const RARITY_STYLE: Record<string, string> = {
  comune: "border-primary/30 bg-night/60",
  rara: "border-cyan-400/40 bg-cyan-500/10",
  epica: "border-fuchsia-400/50 bg-fuchsia-500/10",
};

function LabPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role === "papa" ? "papa" : "lorenzo";

  const [catalog, setCatalog] = useState<Record<string, Ingredient>>({});
  const [inventory, setInventory] = useState<InvRow[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [slotA, setSlotA] = useState<string | null>(null);
  const [slotB, setSlotB] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Discovery | null>(null);

  const callInvent = useServerFn(inventDiscovery);

  const load = async () => {
    const [{ data: ing }, { data: inv }, { data: rec }, { data: disc }] = await Promise.all([
      supabase.from("ingredients").select("*"),
      supabase.from("inventory").select("*").eq("agent", agent),
      supabase.from("recipes").select("*"),
      supabase
        .from("discoveries")
        .select("*")
        .eq("agent", agent)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    const map: Record<string, Ingredient> = {};
    for (const i of (ing ?? []) as Ingredient[]) map[i.key] = i;
    setCatalog(map);
    setInventory((inv ?? []) as InvRow[]);
    setRecipes((rec ?? []) as Recipe[]);
    setDiscoveries((disc ?? []) as Discovery[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("lab-rt")
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

  const inventoryWithMeta = useMemo(
    () =>
      inventory
        .map((r) => ({ ...r, meta: catalog[r.ingredient_key] }))
        .filter((r) => r.meta),
    [inventory, catalog],
  );

  const pickSlot = (key: string) => {
    if (!slotA) return setSlotA(key);
    if (!slotB && key !== slotA) return setSlotB(key);
    if (slotA === key) return setSlotA(slotB), setSlotB(null);
    if (slotB === key) return setSlotB(null);
    setSlotA(slotB);
    setSlotB(key);
  };

  const findRecipe = (a: string, b: string) =>
    recipes.find(
      (r) =>
        (r.input_a === a && r.input_b === b) ||
        (r.input_a === b && r.input_b === a),
    );

  const combine = async () => {
    if (!slotA || !slotB || busy) return;
    setBusy(true);
    try {
      // Verifica disponibilità
      const invA = inventory.find((i) => i.ingredient_key === slotA);
      const invB = inventory.find((i) => i.ingredient_key === slotB);
      const sameKey = slotA === slotB;
      if (!invA || !invB) return;
      if (sameKey && invA.qty < 2) return;

      // Consuma
      await consumeIngredient(agent, slotA);
      await consumeIngredient(agent, slotB);

      // Cerca ricetta o invoca AI
      const recipe = findRecipe(slotA, slotB);
      let result: Omit<Discovery, "id" | "created_at"> & { is_ai: boolean };
      if (recipe) {
        result = {
          result_name: recipe.result_name,
          result_emoji: recipe.result_emoji,
          description: recipe.description,
          xp: recipe.xp,
          is_ai: false,
        };
      } else {
        const aiRes = await callInvent({
          data: {
            ingredientA: { key: slotA, name: catalog[slotA].name, emoji: catalog[slotA].emoji },
            ingredientB: { key: slotB, name: catalog[slotB].name, emoji: catalog[slotB].emoji },
          },
        });
        result = {
          result_name: aiRes.result_name,
          result_emoji: aiRes.result_emoji,
          description: aiRes.description,
          xp: aiRes.xp,
          is_ai: true,
        };
      }

      // Salva scoperta
      const { data: saved } = await supabase
        .from("discoveries")
        .insert({
          agent,
          input_a: slotA,
          input_b: slotB,
          ...result,
        })
        .select()
        .single();

      // Se ricetta nota, premia con un badge nei "rewards"
      if (!result.is_ai) {
        await supabase.from("rewards").insert({
          agent,
          badge: "lab",
          title: result.result_name,
          icon: result.result_emoji,
        });
      }

      if (saved) {
        setFlash(saved as Discovery);
        setDiscoveries((d) => [saved as Discovery, ...d]);
      }
      setSlotA(null);
      setSlotB(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const giveStarter = async () => {
    await grantIngredients(agent, ["seed_yellow", "sun_energy", "spark", "star_dust"]);
    await load();
  };

  const canCombine =
    slotA &&
    slotB &&
    !busy &&
    (() => {
      const a = inventory.find((i) => i.ingredient_key === slotA);
      const b = inventory.find((i) => i.ingredient_key === slotB);
      if (!a || !b) return false;
      if (slotA === slotB) return a.qty >= 2;
      return true;
    })();

  return (
    <PageShell
      title="Laboratorio"
      subtitle="Esperimenti segreti · combina ingredienti"
      action={
        session?.role === "papa" && (
          <button onClick={giveStarter} className="panel px-3 py-2 text-xs flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Kit
          </button>
        )
      }
    >
      {/* Banco di lavoro */}
      <div className="panel-strong scanline relative overflow-hidden p-5 space-y-4">
        <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80 text-center">
          // Banco di lavoro
        </p>
        <div className="flex items-center justify-center gap-3">
          <Slot ing={slotA ? catalog[slotA] : null} onClear={() => setSlotA(null)} />
          <Plus className="h-5 w-5 text-primary" />
          <Slot ing={slotB ? catalog[slotB] : null} onClear={() => setSlotB(null)} />
        </div>
        <button
          onClick={combine}
          disabled={!canCombine}
          className="btn-neon w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <FlaskConical className="h-4 w-4" />
          {busy ? "Reazione in corso…" : "Combina"}
        </button>
      </div>

      {/* Inventario */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Inventario ({inventoryWithMeta.length})
        </p>
        {inventoryWithMeta.length === 0 ? (
          <div className="panel p-6 text-center text-xs text-muted-foreground">
            Nessun ingrediente. Completa missioni o scansiona Pikmin per raccoglierne!
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {inventoryWithMeta.map((row) => {
              const m = row.meta!;
              const sel = slotA === m.key || slotB === m.key;
              return (
                <button
                  key={row.id}
                  onClick={() => pickSlot(m.key)}
                  className={`relative rounded-xl border p-2 flex flex-col items-center gap-1 transition-all ${
                    RARITY_STYLE[m.rarity] ?? RARITY_STYLE.comune
                  } ${sel ? "ring-2 ring-primary scale-95" : "active:scale-95"}`}
                >
                  <span className="text-2xl leading-none">{m.emoji}</span>
                  <span className="text-[10px] text-center leading-tight line-clamp-2">{m.name}</span>
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full font-bold">
                    {row.qty}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cronologia scoperte */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Scoperte recenti
        </p>
        {discoveries.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">
            Nessun esperimento ancora.
          </p>
        ) : (
          <div className="space-y-2">
            {discoveries.map((d) => (
              <div key={d.id} className="panel p-3 flex items-center gap-3">
                <span className="text-3xl">{d.result_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm text-glow truncate">{d.result_name}</p>
                  {d.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{d.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-primary text-glow font-display text-sm">+{d.xp}</p>
                  {d.is_ai && (
                    <span className="text-[9px] uppercase tracking-widest text-fuchsia-300">
                      sperim.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flash scoperta */}
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
              className="panel-strong p-8 text-center max-w-xs glow-soft"
            >
              <Sparkles className="h-5 w-5 text-primary mx-auto mb-2 animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">
                {flash.is_ai ? "// Esperimento" : "// Ricetta scoperta!"}
              </p>
              <p className="text-7xl mt-3">{flash.result_emoji}</p>
              <p className="font-display text-xl text-glow mt-2">{flash.result_name}</p>
              {flash.description && (
                <p className="text-xs text-muted-foreground mt-2">{flash.description}</p>
              )}
              <p className="font-display text-2xl text-primary text-glow mt-3">+{flash.xp} XP</p>
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

function Slot({ ing, onClear }: { ing: Ingredient | null; onClear: () => void }) {
  return (
    <div
      className={`relative h-24 w-24 rounded-2xl border-2 border-dashed flex items-center justify-center ${
        ing ? "border-primary bg-primary/10" : "border-primary/30 bg-night/40"
      }`}
    >
      {ing ? (
        <>
          <div className="text-center">
            <div className="text-4xl">{ing.emoji}</div>
            <div className="text-[10px] mt-1 px-1 line-clamp-1">{ing.name}</div>
          </div>
          <button
            onClick={onClear}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive/80 text-white flex items-center justify-center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">vuoto</span>
      )}
    </div>
  );
}
