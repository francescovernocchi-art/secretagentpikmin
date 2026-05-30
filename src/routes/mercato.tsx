import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { addCoins, getCoins, spendCoins } from "@/lib/coins";
import { grantIngredients } from "@/lib/ingredients";
import { MarketPanel } from "@/components/game/MarketPanel";
import { GAME_IDENTITY } from "@/data/secretPikminWorld";
import { isSupabaseConfigured } from "@/lib/game/db";
import { DEMO_INGREDIENTS, DEMO_RECIPES, isDemoModeActive, isDemoEligible } from "@/lib/demo-mode";
import { triggerGameFx } from "@/lib/game-event-fx";
import { MarketGameCard, rarityFromString } from "@/components/game/market/MarketGameCard";
import { Coins, ShoppingBag, FlaskConical, Lock, Pencil, Check, X } from "lucide-react";

export const Route = createFileRoute("/mercato")({ component: MercatoPage });

interface Ingredient {
  key: string;
  name: string;
  emoji: string;
  rarity: string;
  price_coins: number | null;
}
interface Recipe {
  id: string;
  result_name: string;
  result_emoji: string;
  description: string | null;
  xp: number;
  price_coins: number | null;
  locked: boolean;
}

function MercatoPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role === "papa" ? "papa" : "lorenzo";
  const isPapa = session?.role === "papa";

  const [coins, setCoinsState] = useState(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"ingredients" | "recipes">("ingredients");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: "ing" | "rec"; id: string } | null>(null);

  const load = async () => {
    if (!isSupabaseConfigured() || isDemoModeActive()) {
      setIngredients(DEMO_INGREDIENTS as Ingredient[]);
      setRecipes(DEMO_RECIPES as Recipe[]);
      setUnlocked(new Set());
      setCoinsState(agent === "papa" ? 120 : 80);
      return;
    }
    const [{ data: ing }, { data: rec }, { data: unl }] = await Promise.all([
      supabase.from("ingredients").select("key, name, emoji, rarity, price_coins").order("rarity"),
      supabase.from("recipes").select("id, result_name, result_emoji, description, xp, price_coins, locked").order("created_at", { ascending: false }),
      supabase.from("recipe_unlocks").select("recipe_id").eq("agent", agent),
    ]);
    setIngredients((ing ?? []) as Ingredient[]);
    setRecipes((rec ?? []) as Recipe[]);
    setUnlocked(new Set((unl ?? []).map((u) => u.recipe_id as string)));
    setCoinsState(await getCoins(agent));
  };

  useEffect(() => {
    load();
    if (!isSupabaseConfigured() || isDemoModeActive()) return;
    const ch = supabase
      .channel("market-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_coins" }, () => getCoins(agent).then(setCoinsState))
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ingredients" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "recipe_unlocks" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buyIngredient = async (ing: Ingredient) => {
    const price = ing.price_coins ?? 0;
    if (!price) return;
    if (busy) return;
    setBusy(ing.key);
    try {
      if (isDemoEligible()) {
        if (coins < price) {
          toast.error("Monete insufficienti");
          return;
        }
        setCoinsState((c) => c - price);
      } else {
        const ok = await spendCoins(agent, price, "buy_ingredient", { key: ing.key });
        if (!ok) {
          toast.error("Monete insufficienti");
          return;
        }
        await grantIngredients(agent, [ing.key]);
        setCoinsState(await getCoins(agent));
      }
      triggerGameFx("pickup");
      toast.success(`Comprato: ${ing.emoji} ${ing.name}`);
    } finally {
      setBusy(null);
    }
  };

  const buyRecipe = async (r: Recipe) => {
    const price = r.price_coins ?? 0;
    if (!price) return;
    if (unlocked.has(r.id)) return;
    if (busy) return;
    setBusy(r.id);
    try {
      if (isDemoEligible()) {
        if (coins < price) {
          toast.error("Monete insufficienti");
          return;
        }
        setCoinsState((c) => c - price);
      } else {
        const ok = await spendCoins(agent, price, "buy_recipe", { recipe_id: r.id });
        if (!ok) {
          toast.error("Monete insufficienti");
          return;
        }
        await supabase.from("recipe_unlocks").insert({ agent, recipe_id: r.id });
        setCoinsState(await getCoins(agent));
      }
      setUnlocked((u) => new Set([...u, r.id]));
      triggerGameFx("mission_complete");
      toast.success(`Ricetta sbloccata: ${r.result_name}`);
    } finally {
      setBusy(null);
    }
  };

  const ingredientsForSale = useMemo(
    () => ingredients.filter((i) => (i.price_coins ?? 0) > 0 || isPapa),
    [ingredients, isPapa],
  );
  const recipesForSale = useMemo(
    () => recipes.filter((r) => (r.locked && (r.price_coins ?? 0) > 0) || isPapa),
    [recipes, isPapa],
  );

  return (
    <PageShell
      title="Market"
      subtitle={`${GAME_IDENTITY.subtitle} · Mercato Galattico e scambi famiglia`}
      theme="market"
      action={
        <div className="panel px-3 py-2 text-xs flex items-center gap-1.5 text-amber-300">
          <Coins className="h-3.5 w-3.5" />
          <span className="font-display text-base">{coins}</span>
        </div>
      }
    >
      <MarketPanel compact />

      {isPapa && (
        <button
          onClick={async () => {
            if (isDemoEligible()) {
              setCoinsState((c) => c + 50);
              toast.success("+50 monete demo");
              return;
            }
            await addCoins(agent, 50, "admin_grant");
            setCoinsState(await getCoins(agent));
          }}
          className="panel w-full py-2 text-[11px] text-muted-foreground"
        >
          [Comandante] +50 monete di test
        </button>
      )}

      <div className="grid grid-cols-2 gap-2 market-tabs">
        <button
          onClick={() => setTab("ingredients")}
          className={`market-tab py-2 text-xs flex items-center justify-center gap-1.5 ${tab === "ingredients" ? "market-tab-active" : ""}`}
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Ingredienti
        </button>
        <button
          onClick={() => setTab("recipes")}
          className={`market-tab py-2 text-xs flex items-center justify-center gap-1.5 ${tab === "recipes" ? "market-tab-active" : ""}`}
        >
          <FlaskConical className="h-3.5 w-3.5" /> Ricette
        </button>
      </div>

      {tab === "ingredients" ? (
        ingredientsForSale.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-10">Nessun ingrediente in vendita.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ingredientsForSale.map((ing) => {
              const price = ing.price_coins ?? 0;
              const can = coins >= price && price > 0;
              const rarity = rarityFromString(ing.rarity);
              return (
                <MarketGameCard
                  key={ing.key}
                  emoji={ing.emoji}
                  name={ing.name}
                  rarity={rarity}
                  subtitle="Bottega galattica"
                  iconKind="berry"
                  value={
                    <span className="text-amber-300 text-xs flex items-center gap-1">
                      <Coins className="h-3 w-3" /> {price || "—"}
                    </span>
                  }
                  footer={
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => buyIngredient(ing)}
                        disabled={!can || busy === ing.key}
                        className="btn-neon px-3 py-1 text-[11px] disabled:opacity-40"
                      >
                        {busy === ing.key ? "…" : "Compra"}
                      </button>
                      {isPapa && (
                        <button
                          onClick={() => setEditing({ kind: "ing", id: ing.key })}
                          className="panel h-7 w-7 flex items-center justify-center text-primary"
                          aria-label="Modifica prezzo"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        )
      ) : recipesForSale.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-10">Nessuna ricetta in vendita.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {recipesForSale.map((r) => {
            const price = r.price_coins ?? 0;
            const owned = unlocked.has(r.id);
            const can = !owned && coins >= price && price > 0;
            const rarity = { label: "Ricetta", level: 3 };
            return (
              <MarketGameCard
                key={r.id}
                emoji={r.result_emoji}
                name={r.result_name}
                rarity={rarity}
                subtitle={r.description ?? `+${r.xp} XP`}
                iconKind="crystal"
                badge={owned ? <Check className="h-3 w-3 text-primary" /> : <Lock className="h-3 w-3 text-muted-foreground" />}
                value={
                  <span className="text-amber-300 text-xs flex items-center gap-1">
                    <Coins className="h-3 w-3" /> {price || "—"}
                  </span>
                }
                footer={
                  <div className="flex items-center justify-end gap-2">
                    {owned ? (
                      <span className="text-[10px] text-primary flex items-center gap-1">
                        <Check className="h-3 w-3" /> Sbloccata
                      </span>
                    ) : (
                      <button
                        onClick={() => buyRecipe(r)}
                        disabled={!can || busy === r.id}
                        className="btn-neon px-3 py-1 text-[11px] disabled:opacity-40 flex items-center gap-1"
                      >
                        <Lock className="h-3 w-3" />
                        {busy === r.id ? "…" : "Sblocca"}
                      </button>
                    )}
                    {isPapa && (
                      <button
                        onClick={() => setEditing({ kind: "rec", id: r.id })}
                        className="panel h-7 w-7 flex items-center justify-center text-primary"
                        aria-label="Modifica"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {editing && isPapa && (
          <PriceEditor
            kind={editing.kind}
            id={editing.id}
            ingredients={ingredients}
            recipes={recipes}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function PriceEditor({
  kind,
  id,
  ingredients,
  recipes,
  onClose,
  onSaved,
}: {
  kind: "ing" | "rec";
  id: string;
  ingredients: Ingredient[];
  recipes: Recipe[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const target =
    kind === "ing"
      ? ingredients.find((i) => i.key === id)
      : recipes.find((r) => r.id === id);
  const initialPrice = target ? (("price_coins" in target ? target.price_coins : 0) ?? 0) : 0;
  const initialLocked = kind === "rec" ? (target as Recipe | undefined)?.locked ?? false : false;
  const [price, setPrice] = useState<number>(initialPrice);
  const [locked, setLocked] = useState<boolean>(initialLocked);

  const save = async () => {
    if (kind === "ing") {
      await supabase.from("ingredients").update({ price_coins: price || null }).eq("key", id);
    } else {
      await supabase.from("recipes").update({ price_coins: price || null, locked }).eq("id", id);
    }
    onSaved();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-night/80 backdrop-blur-sm flex items-end"
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full panel-strong rounded-b-none p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base text-glow">
            Prezzo {kind === "ing" ? "ingrediente" : "ricetta"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground"><X /></button>
        </div>
        <label className="block text-xs text-muted-foreground">
          Costo in monete (0 = non in vendita)
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
            className="mt-1 w-full rounded-xl bg-night/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        {kind === "rec" && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={locked}
              onChange={(e) => setLocked(e.target.checked)}
              className="accent-primary"
            />
            Ricetta bloccata (visibile solo dopo l'acquisto)
          </label>
        )}
        <button onClick={save} className="btn-neon w-full py-2.5 text-sm">Salva</button>
      </motion.div>
    </motion.div>
  );
}
