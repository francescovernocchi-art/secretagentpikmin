import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { ResultIcon } from "@/components/ResultIcon";
import { IconGalleryPicker } from "@/components/IconGalleryPicker";
import { consumeIngredient } from "@/lib/ingredients";
import {
  BookOpen,
  FlaskConical,
  Sparkles,
  Check,
  X,
  Search,
  Pencil,
  Upload,
  Trash2,
  Plus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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
  locked?: boolean;
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

const MAX_SLOTS = 6;
const sortedKey = (keys: string[]) => [...keys].sort().join("|");
const recipeKeys = (r: Recipe): string[] =>
  r.inputs && r.inputs.length
    ? r.inputs
    : ([r.input_a, r.input_b].filter(Boolean) as string[]);

function RecipesPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role === "papa" ? "papa" : "lorenzo";
  const isPapa = session?.role === "papa";

  const [catalog, setCatalog] = useState<Record<string, Ingredient>>({});
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InvRow[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "ready">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Discovery | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);

  const load = async () => {
    const [{ data: ing }, { data: rec }, { data: inv }, { data: unl }] = await Promise.all([
      supabase.from("ingredients").select("key, name, emoji, rarity"),
      supabase.from("recipes").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory").select("ingredient_key, qty").eq("agent", agent),
      supabase.from("recipe_unlocks").select("recipe_id").eq("agent", agent),
    ]);
    const map: Record<string, Ingredient> = {};
    for (const i of (ing ?? []) as Ingredient[]) map[i.key] = i;
    setCatalog(map);
    setRecipes((rec ?? []) as Recipe[]);
    setInventory((inv ?? []) as InvRow[]);
    setUnlocked(new Set((unl ?? []).map((u) => u.recipe_id as string)));
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
    return recipes
      .filter((r) => !r.locked || unlocked.has(r.id) || isPapa)
      .map((r) => {
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
  }, [recipes, inventory, catalog, unlocked, isPapa]);

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
      for (const it of items) {
        for (let i = 0; i < it.need; i++) {
          await consumeIngredient(agent, it.key);
        }
      }
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

      {filtered.length === 0 ? (
        <div className="panel p-6 text-center text-xs text-muted-foreground space-y-2">
          <Sparkles className="h-5 w-5 text-primary mx-auto opacity-70" />
          <p>
            {recipes.length === 0
              ? "Nessuna ricetta nota. Sperimenta nel Lab o chiedi al Comandante di aggiungerne."
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
              canEdit={isPapa}
              onEdit={() => setEditing(entry.recipe)}
            />
          ))}
        </div>
      )}

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
                // Ricetta completata
              </p>
              <div className="mt-3 flex justify-center">
                <ResultIcon value={flash.result_emoji} className="text-7xl" />
              </div>
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

      <AnimatePresence>
        {editing && isPapa && (
          <RecipeEditModal
            recipe={editing}
            catalog={catalog}
            existing={recipes}
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
  canEdit,
  onEdit,
}: {
  entry: { recipe: Recipe; items: AnnotatedItem[]; ready: boolean; known: boolean };
  busy: boolean;
  onPrepare: () => void;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const { recipe, items, ready, known } = entry;
  return (
    <motion.div
      layout
      className={`panel p-3 space-y-3 ${ready ? "ring-1 ring-primary/40" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl border border-primary/30 bg-night/60 flex items-center justify-center overflow-hidden">
          <ResultIcon value={recipe.result_emoji} className="text-3xl" alt={recipe.result_name} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base text-glow truncate">{recipe.result_name}</p>
          {recipe.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2">
              {recipe.description}
            </p>
          )}
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className="text-primary text-glow font-display text-sm">+{recipe.xp}</p>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">XP</p>
          {canEdit && (
            <button
              onClick={onEdit}
              className="mt-1 panel h-7 w-7 flex items-center justify-center text-primary"
              aria-label="Modifica ricetta"
              title="Modifica ricetta"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
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

function RecipeEditModal({
  recipe,
  catalog,
  existing,
  onClose,
  onSaved,
}: {
  recipe: Recipe;
  catalog: Record<string, Ingredient>;
  existing: Recipe[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const ingredients = useMemo(
    () => Object.values(catalog).sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );
  const initialInputs = recipeKeys(recipe);
  const [inputs, setInputs] = useState<string[]>(
    initialInputs.length >= 2 ? initialInputs : [...initialInputs, "", ""].slice(0, 2),
  );
  const [name, setName] = useState(recipe.result_name);
  const [icon, setIcon] = useState(recipe.result_emoji);
  const [description, setDescription] = useState(recipe.description ?? "");
  const [xp, setXp] = useState(recipe.xp);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const filledInputs = inputs.filter(Boolean);

  const duplicate = useMemo(() => {
    if (filledInputs.length < 2) return false;
    const target = sortedKey(filledInputs);
    return existing.some(
      (r) => r.id !== recipe.id && sortedKey(recipeKeys(r)) === target,
    );
  }, [existing, filledInputs, recipe.id]);

  const updateAt = (idx: number, value: string) =>
    setInputs((prev) => prev.map((v, i) => (i === idx ? value : v)));
  const addInput = () =>
    setInputs((prev) => (prev.length < MAX_SLOTS ? [...prev, ""] : prev));
  const removeAt = (idx: number) =>
    setInputs((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));

  const validate = (): string | null => {
    const trimmedName = name.trim();
    const trimmedIcon = icon.trim();
    const trimmedDesc = description.trim();
    if (filledInputs.length < 2) return "Servono almeno 2 ingredienti.";
    if (!trimmedName || trimmedName.length > 80)
      return "Nome risultato richiesto (max 80).";
    if (!trimmedIcon) return "Icona richiesta (emoji o immagine).";
    if (trimmedIcon.length > 500) return "Icona troppo lunga.";
    if (trimmedDesc.length > 240) return "Descrizione troppo lunga (max 240).";
    const xpInt = Math.round(Number(xp));
    if (!Number.isFinite(xpInt) || xpInt < 0 || xpInt > 999)
      return "XP fuori range (0-999).";
    if (duplicate) return "Esiste già una ricetta con questa combinazione.";
    return null;
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un file immagine");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Immagine troppo grande", { description: "Max 2 MB." });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `recipe-icons/${recipe.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("captures")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("captures").getPublicUrl(path);
      setIcon(data.publicUrl);
      toast.success("Icona caricata");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore caricamento";
      toast.error("Upload fallito", { description: msg });
    } finally {
      setUploading(false);
    }
  };

  const trySave = () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setConfirmSave(true);
  };

  const doSave = async () => {
    setSaving(true);
    const { error: dbErr } = await supabase
      .from("recipes")
      .update({
        input_a: filledInputs[0],
        input_b: filledInputs[1],
        inputs: filledInputs,
        result_name: name.trim(),
        result_emoji: icon.trim(),
        description: description.trim() || null,
        xp: Math.round(Number(xp)),
      })
      .eq("id", recipe.id);
    setSaving(false);
    setConfirmSave(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    toast.success("Ricetta aggiornata");
    onSaved();
  };

  const doDelete = async () => {
    setSaving(true);
    const { error: dbErr } = await supabase.from("recipes").delete().eq("id", recipe.id);
    setSaving(false);
    setConfirmDelete(false);
    if (dbErr) {
      toast.error("Eliminazione fallita", { description: dbErr.message });
      return;
    }
    toast.success("Ricetta eliminata");
    onSaved();
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
            // Modifica ricetta
          </p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {inputs.map((val, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                <Field label={`Ingrediente ${idx + 1}`}>
                  <div className="relative">
                    <select
                      value={val}
                      onChange={(e) => updateAt(idx, e.target.value)}
                      className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 pl-9 text-sm appearance-none"
                    >
                      <option value="">— scegli —</option>
                      {ingredients.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.emoji} {o.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                      {ingredients.find((o) => o.key === val)?.emoji ?? "·"}
                    </span>
                  </div>
                </Field>
              </div>
              {inputs.length > 2 && (
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
          {inputs.length < MAX_SLOTS && (
            <button
              onClick={addInput}
              className="panel w-full py-2 text-xs flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Aggiungi ingrediente
            </button>
          )}
        </div>

        <Field label="Nome risultato">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 text-sm"
          />
        </Field>

        <div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Icona risultato
          </span>
          <div className="mt-1 flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl border border-primary/30 bg-night/60 flex items-center justify-center overflow-hidden shrink-0">
              {icon ? (
                <ResultIcon value={icon} className="text-3xl" alt="anteprima" />
              ) : (
                <span className="text-xs text-muted-foreground">?</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={500}
                placeholder="Emoji ✨ oppure URL immagine"
                className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="panel px-3 py-1.5 text-[11px] flex items-center gap-1 disabled:opacity-40"
                >
                  <Upload className="h-3 w-3" />
                  {uploading ? "Carico…" : "Carica icona"}
                </button>
                <IconGalleryPicker onPick={(url) => setIcon(url)} />
                {icon && (
                  <button
                    type="button"
                    onClick={() => setIcon("")}
                    className="panel px-3 py-1.5 text-[11px] text-muted-foreground"
                  >
                    Pulisci
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickFile}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <Field label="Descrizione (opzionale)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={240}
            rows={2}
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
            Una ricetta con questa combinazione esiste già.
          </p>
        )}
        {error && <p className="text-[11px] text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
            className="panel px-3 py-2 text-xs flex items-center gap-1 text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Elimina
          </button>
          <button onClick={onClose} className="panel flex-1 py-2 text-xs" disabled={saving}>
            Annulla
          </button>
          <button
            onClick={trySave}
            disabled={saving || duplicate || uploading}
            className="btn-neon flex-1 py-2 text-xs disabled:opacity-40"
          >
            {saving ? "Salvo…" : "Salva"}
          </button>
        </div>

        <AlertDialog open={confirmSave} onOpenChange={(o) => !saving && setConfirmSave(o)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confermi le modifiche?</AlertDialogTitle>
              <AlertDialogDescription>
                La ricetta verrà aggiornata per tutti gli agenti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                disabled={saving}
                onClick={(e) => {
                  e.preventDefault();
                  doSave();
                }}
              >
                {saving ? "Salvo…" : "Conferma"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmDelete} onOpenChange={(o) => !saving && setConfirmDelete(o)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare la ricetta?</AlertDialogTitle>
              <AlertDialogDescription>
                Operazione non reversibile. Le scoperte già registrate restano nello storico.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                disabled={saving}
                onClick={(e) => {
                  e.preventDefault();
                  doDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {saving ? "Elimino…" : "Elimina"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
