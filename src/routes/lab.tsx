import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { consumeIngredient, grantIngredients } from "@/lib/ingredients";
import { inventDiscovery } from "@/lib/lab.functions";
import { FlaskConical, Sparkles, X, Plus, BookPlus, BookOpen } from "lucide-react";

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
  input_a: string | null;
  input_b: string | null;
  inputs: string[] | null;
  result_name: string;
  result_emoji: string;
  description: string | null;
  xp: number;
}

const MAX_SLOTS = 6;
const sortedKey = (keys: string[]) => [...keys].sort().join("|");
const recipeInputs = (r: Recipe): string[] =>
  r.inputs && r.inputs.length
    ? r.inputs
    : ([r.input_a, r.input_b].filter(Boolean) as string[]);
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
  const [slots, setSlots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Discovery | null>(null);
  const [showRecipeForm, setShowRecipeForm] = useState(false);

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

  // Conta quante volte una chiave è già nel banco
  const slotCount = (key: string) => slots.filter((k) => k === key).length;
  const ownedOf = (key: string) =>
    inventory.find((i) => i.ingredient_key === key)?.qty ?? 0;

  // Tap su inventario = +1 nel banco. Mostra feedback se non si può aggiungere.
  const addToSlot = (key: string) => {
    const owned = ownedOf(key);
    const used = slotCount(key);
    if (owned <= 0) {
      toast.error("Ingrediente esaurito", {
        description: "Raccoglilo nelle missioni o con la caccia ai Pikmin.",
      });
      return;
    }
    if (slots.length >= MAX_SLOTS) {
      toast.warning(`Banco pieno (max ${MAX_SLOTS})`, {
        description: "Rimuovi un ingrediente per aggiungerne un altro.",
      });
      return;
    }
    if (used >= owned) {
      toast.error("Quantità insufficiente", {
        description: `Hai solo ${owned} × ${catalog[key]?.name ?? key} in inventario.`,
      });
      return;
    }
    setSlots((prev) => [...prev, key]);
  };

  const removeOne = (key: string) =>
    setSlots((prev) => {
      const idx = prev.lastIndexOf(key);
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });

  const removeSlotAt = (idx: number) =>
    setSlots((prev) => prev.filter((_, i) => i !== idx));

  const findRecipe = (keys: string[]) => {
    const target = sortedKey(keys);
    return recipes.find((r) => sortedKey(recipeInputs(r)) === target);
  };

  const combine = async () => {
    if (busy) return;
    if (slots.length < 2) {
      toast.warning("Servono almeno 2 ingredienti");
      return;
    }

    // Verifica disponibilità per chiave (rispettando duplicati nel banco)
    const counts: Record<string, number> = {};
    for (const k of slots) counts[k] = (counts[k] ?? 0) + 1;
    for (const [key, need] of Object.entries(counts)) {
      const have = inventory.find((i) => i.ingredient_key === key)?.qty ?? 0;
      if (have < need) {
        toast.error("Quantità insufficiente", {
          description: `${catalog[key]?.name ?? key}: servono ${need}, disponibili ${have}.`,
        });
        return;
      }
    }

    setBusy(true);
    try {
      // Consuma tutti gli ingredienti del banco
      for (const k of slots) {
        await consumeIngredient(agent, k);
      }

      const recipe = findRecipe(slots);
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
            ingredients: slots.map((k) => ({
              key: k,
              name: catalog[k].name,
              emoji: catalog[k].emoji,
            })),
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

      // Salva scoperta (manteniamo input_a/input_b per compatibilità con i
      // primi due ingredienti, e l'array completo in `inputs`).
      const { data: saved } = await supabase
        .from("discoveries")
        .insert({
          agent,
          input_a: slots[0],
          input_b: slots[1] ?? slots[0],
          inputs: slots,
          ...result,
        })
        .select()
        .single();

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
      setSlots([]);
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
    slots.length >= 2 &&
    !busy &&
    (() => {
      const counts: Record<string, number> = {};
      for (const k of slots) counts[k] = (counts[k] ?? 0) + 1;
      for (const [k, need] of Object.entries(counts)) {
        const have = inventory.find((i) => i.ingredient_key === k)?.qty ?? 0;
        if (have < need) return false;
      }
      return true;
    })();

  return (
    <PageShell
      title="Laboratorio"
      subtitle="Esperimenti segreti · combina ingredienti"
      action={
        <div className="flex items-center gap-2">
          <Link
            to="/ricette"
            className="panel px-3 py-2 text-xs flex items-center gap-1"
            title="Ricettario"
          >
            <BookOpen className="h-3.5 w-3.5" /> Ricette
          </Link>
          {session?.role === "papa" && (
            <>
              <button
                onClick={() => setShowRecipeForm(true)}
                className="panel px-3 py-2 text-xs flex items-center gap-1"
                title="Aggiungi ricetta"
              >
                <BookPlus className="h-3.5 w-3.5" /> Nuova
              </button>
              <button
                onClick={giveStarter}
                className="panel px-3 py-2 text-xs flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Kit
              </button>
            </>
          )}
        </div>
      }
    >
      {/* Banco di lavoro */}
      <div className="panel-strong scanline relative overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">
            // Banco di lavoro
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {slots.length}/{MAX_SLOTS} · {new Set(slots).size} unici
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 min-h-[7rem]">
          {slots.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center px-4">
              Tocca un ingrediente per aggiungerlo. Min 2 · max {MAX_SLOTS}.
              Tocca più volte per duplicare.
            </p>
          ) : (
            (() => {
              // Raggruppa per chiave preservando l'ordine di prima apparizione
              const seen: string[] = [];
              for (const k of slots) if (!seen.includes(k)) seen.push(k);
              return seen.map((key, gIdx) => {
                const ing = catalog[key];
                if (!ing) return null;
                const count = slotCount(key);
                const owned = ownedOf(key);
                const canMore = count < owned && slots.length < MAX_SLOTS;
                return (
                  <span key={key} className="contents">
                    {gIdx > 0 && <Plus className="h-4 w-4 text-primary/70" />}
                    <div className="relative rounded-2xl border-2 border-primary bg-primary/10 px-3 py-2 flex flex-col items-center gap-1 min-w-[5rem]">
                      <div className="text-3xl leading-none">{ing.emoji}</div>
                      <div className="text-[10px] line-clamp-1 text-center">{ing.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          onClick={() => removeOne(key)}
                          className="h-6 w-6 rounded-full bg-night/80 border border-primary/30 text-primary text-sm leading-none flex items-center justify-center active:scale-90"
                          aria-label={`Rimuovi un ${ing.name}`}
                        >
                          −
                        </button>
                        <span className="text-xs font-display text-glow w-6 text-center">
                          ×{count}
                        </span>
                        <button
                          onClick={() => addToSlot(key)}
                          disabled={!canMore}
                          className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm leading-none flex items-center justify-center active:scale-90 disabled:opacity-30"
                          aria-label={`Aggiungi un ${ing.name}`}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        disp. {Math.max(0, owned - count)}/{owned}
                      </span>
                    </div>
                  </span>
                );
              });
            })()
          )}
        </div>
        <div className="flex gap-2">
          {slots.length > 0 && (
            <button
              onClick={() => setSlots([])}
              disabled={busy}
              className="panel px-3 py-2 text-xs"
            >
              Svuota
            </button>
          )}
          <button
            onClick={combine}
            disabled={!canCombine}
            className="btn-neon flex-1 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <FlaskConical className="h-4 w-4" />
            {busy
              ? "Reazione in corso…"
              : slots.length < 2
                ? "Servono almeno 2"
                : slots.length >= 3
                  ? `Combina ×${slots.length}`
                  : "Combina"}
          </button>
        </div>
      </div>

      {/* Inventario */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Inventario ({inventoryWithMeta.length}) · tocca per aggiungere
        </p>
        {inventoryWithMeta.length === 0 ? (
          <div className="panel p-6 text-center text-xs text-muted-foreground">
            Nessun ingrediente. Completa missioni o scansiona Pikmin per raccoglierne!
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {inventoryWithMeta.map((row) => {
              const m = row.meta!;
              const used = slotCount(m.key);
              const remaining = row.qty - used;
              const sel = used > 0;
              const exhausted = remaining <= 0;
              return (
                <button
                  key={row.id}
                  onClick={() => addToSlot(m.key)}
                  className={`relative rounded-xl border p-2 pt-3 flex flex-col items-center gap-1 transition-all ${
                    RARITY_STYLE[m.rarity] ?? RARITY_STYLE.comune
                  } ${sel ? "ring-2 ring-primary" : "active:scale-95"} ${
                    exhausted ? "opacity-50" : ""
                  }`}
                >
                  <span className="text-2xl leading-none">{m.emoji}</span>
                  <span className="text-[10px] text-center leading-tight line-clamp-2">{m.name}</span>
                  {/* badge disponibili */}
                  <span
                    className={`absolute -top-1 -right-1 text-[10px] px-1.5 rounded-full font-bold ${
                      exhausted
                        ? "bg-destructive/80 text-white"
                        : "bg-primary text-primary-foreground"
                    }`}
                    title={`${remaining} disponibili su ${row.qty}`}
                  >
                    {remaining}
                  </span>
                  {/* badge in uso */}
                  {used > 0 && (
                    <span className="absolute -top-1 -left-1 bg-fuchsia-500 text-white text-[10px] px-1.5 rounded-full font-bold">
                      ·{used}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground text-center">
          <span className="inline-block h-2 w-2 rounded-full bg-primary mr-1 align-middle" />
          disponibili
          <span className="inline-block h-2 w-2 rounded-full bg-fuchsia-500 mx-1 ml-3 align-middle" />
          in uso nel banco
        </p>
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

      {/* Form nuova ricetta (solo papà) */}
      <AnimatePresence>
        {showRecipeForm && session?.role === "papa" && (
          <RecipeForm
            catalog={catalog}
            existing={recipes}
            onClose={() => setShowRecipeForm(false)}
            onCreated={async () => {
              setShowRecipeForm(false);
              await load();
            }}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

interface RecipeFormProps {
  catalog: Record<string, Ingredient>;
  existing: Recipe[];
  onClose: () => void;
  onCreated: () => void;
}

function RecipeForm({ catalog, existing, onClose, onCreated }: RecipeFormProps) {
  const ingredients = useMemo(
    () => Object.values(catalog).sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );
  const [recipeInputsState, setRecipeInputsState] = useState<string[]>(["", ""]);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [xp, setXp] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filledInputs = recipeInputsState.filter(Boolean);

  const duplicate = useMemo(() => {
    if (filledInputs.length < 2) return false;
    const target = sortedKey(filledInputs);
    return existing.some((r) => sortedKey(recipeInputs(r)) === target);
  }, [existing, filledInputs]);

  const updateAt = (idx: number, value: string) =>
    setRecipeInputsState((prev) => prev.map((v, i) => (i === idx ? value : v)));
  const addInput = () =>
    setRecipeInputsState((prev) => (prev.length < MAX_SLOTS ? [...prev, ""] : prev));
  const removeAt = (idx: number) =>
    setRecipeInputsState((prev) =>
      prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev,
    );

  const submit = async () => {
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmoji = emoji.trim();
    const trimmedDesc = description.trim();

    if (filledInputs.length < 2)
      return setError("Servono almeno 2 ingredienti.");
    if (!trimmedName || trimmedName.length > 80)
      return setError("Nome risultato richiesto (max 80).");
    if (!trimmedEmoji || trimmedEmoji.length > 8)
      return setError("Emoji richiesta (max 8 caratteri).");
    if (trimmedDesc.length > 240)
      return setError("Descrizione troppo lunga (max 240).");
    const xpInt = Math.round(Number(xp));
    if (!Number.isFinite(xpInt) || xpInt < 0 || xpInt > 999)
      return setError("XP fuori range (0-999).");
    if (duplicate) return setError("Esiste già una ricetta con questa combinazione.");

    setSaving(true);
    const { error: dbErr } = await supabase.from("recipes").insert({
      input_a: filledInputs[0],
      input_b: filledInputs[1],
      inputs: filledInputs,
      result_name: trimmedName,
      result_emoji: trimmedEmoji,
      description: trimmedDesc || null,
      xp: xpInt,
    });
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    onCreated();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-night/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="panel-strong w-full max-w-md p-5 space-y-3 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">
            // Nuova ricetta
          </p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {recipeInputsState.map((val, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                <IngredientSelect
                  label={`Ingrediente ${idx + 1}`}
                  value={val}
                  onChange={(v) => updateAt(idx, v)}
                  options={ingredients}
                />
              </div>
              {recipeInputsState.length > 2 && (
                <button
                  onClick={() => removeAt(idx)}
                  className="panel h-9 w-9 flex items-center justify-center text-destructive"
                  aria-label="Rimuovi ingrediente"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {recipeInputsState.length < MAX_SLOTS && (
            <button
              onClick={addInput}
              className="panel w-full py-2 text-xs flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Aggiungi ingrediente
            </button>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="Nome risultato">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Es. Pozione di luce"
              className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Emoji">
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={8}
              placeholder="✨"
              className="w-20 bg-night/60 border border-primary/20 rounded-lg px-3 py-2 text-center text-xl"
            />
          </Field>
        </div>

        <Field label="Descrizione (opzionale)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={240}
            rows={2}
            placeholder="Cosa succede quando si combinano…"
            className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </Field>

        <Field label={`XP (${xp})`}>
          <input
            type="range"
            min={0}
            max={100}
            value={xp}
            onChange={(e) => setXp(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </Field>

        {duplicate && (
          <p className="text-[11px] text-amber-300">
            Una ricetta con questa coppia esiste già.
          </p>
        )}
        {error && <p className="text-[11px] text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="panel flex-1 py-2 text-xs"
            disabled={saving}
          >
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={saving || duplicate}
            className="btn-neon flex-1 py-2 text-xs disabled:opacity-40"
          >
            {saving ? "Salvo…" : "Salva ricetta"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function IngredientSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Ingredient[];
}) {
  const sel = options.find((o) => o.key === value);
  return (
    <Field label={label}>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 pl-9 text-sm appearance-none"
        >
          <option value="">— scegli —</option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.emoji} {o.name}
            </option>
          ))}
        </select>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
          {sel?.emoji ?? "·"}
        </span>
      </div>
    </Field>
  );
}

function Slot({
  ing,
  onClear,
  compact = false,
}: {
  ing: Ingredient | null;
  onClear: () => void;
  compact?: boolean;
}) {
  const size = compact ? "h-20 w-20" : "h-24 w-24";
  const emojiSize = compact ? "text-3xl" : "text-4xl";
  return (
    <div
      className={`relative ${size} rounded-2xl border-2 border-dashed flex items-center justify-center ${
        ing ? "border-primary bg-primary/10" : "border-primary/30 bg-night/40"
      }`}
    >
      {ing ? (
        <>
          <div className="text-center">
            <div className={emojiSize}>{ing.emoji}</div>
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
