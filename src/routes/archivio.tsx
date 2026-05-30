import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { WikiImage } from "@/components/WikiImage";
import { getSession } from "@/lib/session";
import { PikminSpecializationPanel } from "@/components/game/PikminSpecializationPanel";
import { GAME_IDENTITY } from "@/data/secretPikminWorld";
import { Search, ExternalLink, BookOpen, Pencil, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/archivio")({
  component: ArchivioPage,
});

type Species = {
  id: string;
  key: string;
  name: string;
  color: string | null;
  image_url: string | null;
  description: string | null;
  abilities: string[];
  resistances: string[];
  weaknesses: string[];
  first_appearance: string | null;
  exploration_use: string | null;
  combat_use: string | null;
  source_url: string | null;
  sort_order: number;
};

function ArchivioPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const isAdmin = session?.role === "papa";

  const [items, setItems] = useState<Species[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("");
  const [selected, setSelected] = useState<Species | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Species | null>(null);

  const load = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("pikmin_species")
      .select("*")
      .order("sort_order");
    setItems((data ?? []) as Species[]);
  };

  useEffect(() => {
    load();
  }, []);

  const filters = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      for (const a of it.abilities ?? []) set.add(a);
      for (const r of it.resistances ?? []) set.add(`resiste:${r}`);
    }
    return Array.from(set).sort();
  }, [items]);

  const visible = items.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter) {
      if (filter.startsWith("resiste:")) {
        const r = filter.slice("resiste:".length);
        if (!(i.resistances ?? []).includes(r)) return false;
      } else {
        if (!(i.abilities ?? []).includes(filter)) return false;
      }
    }
    return true;
  });

  const openDetail = (s: Species) => {
    setSelected(s);
    setDraft(s);
    setEditing(false);
  };

  const saveDraft = async () => {
    if (!draft) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("pikmin_species")
      .update({
        name: draft.name,
        image_url: draft.image_url,
        description: draft.description,
        abilities: draft.abilities,
        resistances: draft.resistances,
        weaknesses: draft.weaknesses,
        first_appearance: draft.first_appearance,
        exploration_use: draft.exploration_use,
        combat_use: draft.combat_use,
        source_url: draft.source_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id);
    setEditing(false);
    setSelected(draft);
    await load();
  };

  return (
    <PageShell
      title="Pikmin"
      subtitle={`${GAME_IDENTITY.subtitle} · Archivio specie e squadra`}
      action={<BookOpen className="h-5 w-5 text-primary text-glow" />}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca un Pikmin…"
          className="w-full rounded-xl bg-night/60 border border-border pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setFilter("")}
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider border ${
            filter === "" ? "bg-primary text-primary-foreground border-primary" : "panel text-muted-foreground border-transparent"
          }`}
        >
          Tutti
        </button>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f === filter ? "" : f)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider border ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "panel text-muted-foreground border-transparent"
            }`}
          >
            {f.startsWith("resiste:") ? `🛡️ ${f.slice("resiste:".length)}` : f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visible.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => openDetail(s)}
            className="panel p-3 text-left flex flex-col gap-2 active:scale-[0.98] transition-transform"
            style={{
              boxShadow: s.color ? `inset 0 0 0 1px ${s.color}55, 0 0 18px ${s.color}22` : undefined,
            }}
          >
            <WikiImage src={s.image_url} alt={s.name} fallback="🌱" className="w-full h-28 p-2" />
            <div>
              <p className="font-display text-sm text-glow leading-tight">{s.name}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{s.description}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(s.abilities ?? []).slice(0, 2).map((a) => (
                <span key={a} className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                  {a}
                </span>
              ))}
            </div>
          </motion.button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-glow">{selected.name}</DialogTitle>
              </DialogHeader>

              <WikiImage src={selected.image_url} alt={selected.name} fallback="🌱" className="w-full h-44 p-3" />

              {!editing ? (
                <div className="space-y-3 mt-2 text-sm">
                  <p className="text-muted-foreground">{selected.description}</p>

                  <Field label="Abilità">
                    <ChipList items={selected.abilities} tone="primary" />
                  </Field>
                  <Field label="Resistenze">
                    <ChipList items={selected.resistances} tone="emerald" />
                  </Field>
                  <Field label="Punti deboli">
                    <ChipList items={selected.weaknesses} tone="destructive" />
                  </Field>
                  <Field label="Prima apparizione">
                    <p className="text-foreground/90">{selected.first_appearance ?? "—"}</p>
                  </Field>
                  <Field label="Utilizzo in esplorazione">
                    <p className="text-foreground/90">{selected.exploration_use ?? "—"}</p>
                  </Field>
                  <Field label="Utilizzo in combattimento">
                    <p className="text-foreground/90">{selected.combat_use ?? "—"}</p>
                  </Field>

                  <div className="pt-3 border-t border-border text-[11px] text-muted-foreground">
                    Fonte:{" "}
                    {selected.source_url ? (
                      <a
                        href={selected.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary inline-flex items-center gap-1"
                      >
                        Pikipedia / PikminItalia <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      "Pikipedia / PikminItalia"
                    )}{" "}
                    · CC BY-SA
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => setEditing(true)}
                      className="btn-neon w-full py-2 text-xs flex items-center justify-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Modifica scheda
                    </button>
                  )}
                </div>
              ) : (
                draft && (
                  <div className="space-y-2 mt-2 text-xs">
                    <EditField label="Nome" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
                    <EditField label="URL immagine" value={draft.image_url ?? ""} onChange={(v) => setDraft({ ...draft, image_url: v })} />
                    <EditField label="Descrizione" textarea value={draft.description ?? ""} onChange={(v) => setDraft({ ...draft, description: v })} />
                    <EditArray label="Abilità (virgola)" value={draft.abilities} onChange={(v) => setDraft({ ...draft, abilities: v })} />
                    <EditArray label="Resistenze (virgola)" value={draft.resistances} onChange={(v) => setDraft({ ...draft, resistances: v })} />
                    <EditArray label="Punti deboli (virgola)" value={draft.weaknesses} onChange={(v) => setDraft({ ...draft, weaknesses: v })} />
                    <EditField label="Prima apparizione" value={draft.first_appearance ?? ""} onChange={(v) => setDraft({ ...draft, first_appearance: v })} />
                    <EditField label="Esplorazione" textarea value={draft.exploration_use ?? ""} onChange={(v) => setDraft({ ...draft, exploration_use: v })} />
                    <EditField label="Combattimento" textarea value={draft.combat_use ?? ""} onChange={(v) => setDraft({ ...draft, combat_use: v })} />
                    <EditField label="URL fonte" value={draft.source_url ?? ""} onChange={(v) => setDraft({ ...draft, source_url: v })} />
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => { setEditing(false); setDraft(selected); }} className="flex-1 panel py-2 text-xs">
                        Annulla
                      </button>
                      <button onClick={saveDraft} className="flex-1 btn-neon py-2 text-xs flex items-center justify-center gap-1">
                        <Save className="h-3 w-3" /> Salva
                      </button>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <PikminSpecializationPanel showTypes />
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      {children}
    </div>
  );
}

function ChipList({ items, tone }: { items: string[]; tone: "primary" | "emerald" | "destructive" }) {
  if (!items || items.length === 0) return <p className="text-muted-foreground">—</p>;
  const cls =
    tone === "primary"
      ? "bg-primary/15 text-primary"
      : tone === "emerald"
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-destructive/15 text-destructive";
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it) => (
        <span key={it} className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${cls}`}>
          {it}
        </span>
      ))}
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
      )}
    </label>
  );
}

function EditArray({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <EditField
      label={label}
      value={value.join(", ")}
      onChange={(v) => onChange(v.split(",").map((s) => s.trim()).filter(Boolean))}
    />
  );
}
