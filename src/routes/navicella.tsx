import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { PikminCounter } from "@/components/PikminCounter";
import { pikminCostFor, RARITY_LABEL, RARITY_COLOR } from "@/lib/pikmin";
import { Rocket, Plus, Pencil, Trash2, X, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
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

export const Route = createFileRoute("/navicella")({
  component: ShipPage,
});

interface Part {
  id: string;
  key: string;
  name: string;
  emoji: string;
  description: string | null;
  sort_order: number;
  rarity: string;
}

interface Collected {
  part_key: string;
  collected_by: string;
  collected_at: string;
  source: string;
}

function ShipPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const isPapa = session?.role === "papa";

  const [parts, setParts] = useState<Part[]>([]);
  const [collected, setCollected] = useState<Collected[]>([]);
  const [editing, setEditing] = useState<Part | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("ship_parts").select("*").order("sort_order", { ascending: true }),
      supabase.from("ship_parts_collected").select("part_key, collected_by, collected_at, source"),
    ]);
    setParts((p ?? []) as Part[]);
    setCollected((c ?? []) as Collected[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("navicella-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ship_parts" }, () => load())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ship_parts_collected" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const collectedKeys = useMemo(() => new Set(collected.map((c) => c.part_key)), [collected]);
  const total = parts.length;
  const have = parts.filter((p) => collectedKeys.has(p.key)).length;
  const pct = total === 0 ? 0 : Math.round((have / total) * 100);
  const ready = total > 0 && have === total;

  return (
    <PageShell
      title="Navicella"
      subtitle="Recupera i pezzi · ripara per partire"
      action={
        <div className="flex items-center gap-2">
          <PikminCounter compact />
          {isPapa && (
            <button
              onClick={() => setCreating(true)}
              className="btn-neon px-3 py-2 text-xs flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Pezzo
            </button>
          )}
        </div>
      }
    >
      {/* Stato navicella */}
      <div className="panel-strong scanline relative overflow-hidden p-4 space-y-3">
        <div className="flex items-center gap-3">
          <motion.div
            animate={ready ? { y: [0, -4, 0] } : { rotate: [0, -2, 2, 0] }}
            transition={{ duration: ready ? 1.2 : 3, repeat: Infinity }}
            className={`h-14 w-14 rounded-2xl border flex items-center justify-center text-3xl ${
              ready
                ? "border-primary bg-primary/15 glow-soft"
                : "border-primary/30 bg-night/60"
            }`}
          >
            🚀
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">
              // Stato riparazione
            </p>
            <p className="font-display text-xl text-glow">
              {have}/{total} pezzi
            </p>
            <div className="mt-2 h-2 rounded-full bg-night/80 border border-primary/20 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 20 }}
                className="h-full bg-primary"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {ready
                ? "Navicella pronta al decollo. 🛰️"
                : `Mancano ${total - have} pezzi al decollo.`}
            </p>
          </div>
        </div>
      </div>

      {/* Griglia pezzi */}
      {parts.length === 0 ? (
        <div className="panel p-6 text-center text-xs text-muted-foreground space-y-2">
          <Rocket className="h-5 w-5 text-primary mx-auto opacity-70" />
          <p>
            Nessun pezzo nel catalogo.{" "}
            {isPapa
              ? "Aggiungi il primo pezzo per iniziare."
              : "Aspetta che il Comandante prepari la lista."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {parts.map((p) => {
            const got = collectedKeys.has(p.key);
            const meta = collected.find((c) => c.part_key === p.key);
            return (
              <motion.div
                key={p.id}
                layout
                className={`panel p-3 space-y-1 relative ${
                  got ? "ring-1 ring-primary/40" : "opacity-70"
                }`}
              >
                {isPapa && (
                  <button
                    onClick={() => setEditing(p)}
                    className="absolute top-1.5 right-1.5 panel h-6 w-6 flex items-center justify-center text-primary"
                    aria-label="Modifica pezzo"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl border ${
                    got
                      ? "border-primary/40 bg-primary/10"
                      : "border-primary/15 bg-night/60 grayscale"
                  }`}
                >
                  {got ? p.emoji : "❔"}
                </div>
                <p className="font-display text-sm text-glow leading-tight truncate">
                  {p.name}
                </p>
                {p.description && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {p.description}
                  </p>
                )}
                {got ? (
                  <p className="text-[10px] text-primary flex items-center gap-1">
                    <Check className="h-3 w-3" /> recuperato
                    {meta && (
                      <span className="text-muted-foreground">
                        · {meta.source === "mission" ? "missione" : meta.source === "drop" ? "mappa" : "manuale"}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">// mancante</p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {(creating || editing) && isPapa && (
          <PartEditor
            part={editing}
            existing={parts}
            onClose={() => {
              setEditing(null);
              setCreating(false);
            }}
            onSaved={async () => {
              setEditing(null);
              setCreating(false);
              await load();
            }}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function PartEditor({
  part,
  existing,
  onClose,
  onSaved,
}: {
  part: Part | null;
  existing: Part[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !part;
  const [key, setKey] = useState(part?.key ?? "");
  const [name, setName] = useState(part?.name ?? "");
  const [emoji, setEmoji] = useState(part?.emoji ?? "🛠️");
  const [description, setDescription] = useState(part?.description ?? "");
  const [sortOrder, setSortOrder] = useState(part?.sort_order ?? existing.length + 1);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    const k = key.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,40}$/.test(k))
      return "Chiave: 2-40 caratteri (a-z, 0-9, _ -).";
    if (isNew && existing.some((p) => p.key === k))
      return "Chiave già esistente.";
    if (!name.trim() || name.trim().length > 60) return "Nome richiesto (max 60).";
    if (!emoji.trim() || emoji.trim().length > 8) return "Emoji richiesta (max 8 caratteri).";
    if (description.trim().length > 200) return "Descrizione max 200 caratteri.";
    return null;
  };

  const save = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSaving(true);
    const payload = {
      key: key.trim().toLowerCase(),
      name: name.trim(),
      emoji: emoji.trim(),
      description: description.trim() || null,
      sort_order: Number(sortOrder) || 0,
    };
    const { error: dbErr } = isNew
      ? await supabase.from("ship_parts").insert(payload)
      : await supabase.from("ship_parts").update(payload).eq("id", part!.id);
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    toast.success(isNew ? "Pezzo aggiunto" : "Pezzo aggiornato");
    onSaved();
  };

  const doDelete = async () => {
    if (!part) return;
    setSaving(true);
    const { error: dbErr } = await supabase.from("ship_parts").delete().eq("id", part.id);
    setSaving(false);
    setConfirmDelete(false);
    if (dbErr) {
      toast.error("Eliminazione fallita", { description: dbErr.message });
      return;
    }
    toast.success("Pezzo rimosso");
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
            // {isNew ? "Nuovo pezzo" : "Modifica pezzo"}
          </p>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Field label="Chiave (id univoco)">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={!isNew}
            maxLength={40}
            placeholder="es. reattore"
            className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 text-sm disabled:opacity-60"
          />
        </Field>

        <div className="grid grid-cols-[80px_1fr] gap-2">
          <Field label="Emoji">
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={8}
              className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 text-2xl text-center"
            />
          </Field>
          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="Descrizione (opzionale)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={2}
            className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </Field>

        <Field label={`Ordine (${sortOrder})`}>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-full bg-night/60 border border-primary/20 rounded-lg px-3 py-2 text-sm"
          />
        </Field>

        {error && <p className="text-[11px] text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          {!isNew && (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="panel px-3 py-2 text-xs flex items-center gap-1 text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Elimina
            </button>
          )}
          <button onClick={onClose} disabled={saving} className="panel flex-1 py-2 text-xs">
            Annulla
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="btn-neon flex-1 py-2 text-xs disabled:opacity-40 flex items-center justify-center gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {saving ? "Salvo…" : "Salva"}
          </button>
        </div>

        <AlertDialog open={confirmDelete} onOpenChange={(o) => !saving && setConfirmDelete(o)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare il pezzo?</AlertDialogTitle>
              <AlertDialogDescription>
                Verrà rimosso anche dallo stato della navicella se già recuperato.
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
