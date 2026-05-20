import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { WikiImage } from "@/components/WikiImage";
import { getSession } from "@/lib/session";
import { Search, ExternalLink, Skull, Pencil, Save, ScrollText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PIKMIN_TYPE_EMOJI, PIKMIN_TYPE_LABEL, type EnemyRow, type PikminType } from "@/lib/enemies";

export const Route = createFileRoute("/nemici")({
  component: NemiciPage,
});

type BattleLog = {
  id: string;
  enemy_name: string;
  agent: string;
  result: string;
  summary: string | null;
  created_at: string;
};

function NemiciPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const isAdmin = session?.role === "papa";

  const [items, setItems] = useState<EnemyRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<EnemyRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EnemyRow | null>(null);
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const load = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("enemies")
      .select("*")
      .order("danger_level", { ascending: true });
    setItems((data ?? []) as EnemyRow[]);
  };

  const loadLogs = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("battle_logs")
      .select("id, enemy_name, agent, result, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setLogs((data ?? []) as BattleLog[]);
  };

  useEffect(() => {
    load();
    loadLogs();
    const ch = supabase
      .channel("battle-logs-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_logs" }, () => loadLogs())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const visible = items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));

  const saveDraft = async () => {
    if (!draft) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("enemies")
      .update({
        name: draft.name,
        image_url: draft.image_url,
        description: draft.description,
        danger_level: draft.danger_level,
        habitat: draft.habitat,
        behavior: draft.behavior,
        speed: draft.speed,
        damage: draft.damage,
        hp: draft.hp,
        spawn_probability: draft.spawn_probability,
        pikmin_eat_min: draft.pikmin_eat_min,
        pikmin_eat_max: draft.pikmin_eat_max,
        recommended_pikmin: draft.recommended_pikmin,
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
      title="Nemici"
      subtitle={`Bestiario · ${items.length} creature · Fonte: Pikipedia`}
      action={
        <button onClick={() => setShowLogs(true)} className="panel px-3 py-2 text-xs flex items-center gap-1 text-muted-foreground">
          <ScrollText className="h-3.5 w-3.5" /> Log
        </button>
      }
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca un nemico…"
          className="w-full rounded-xl bg-night/60 border border-border pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visible.map((e, i) => (
          <motion.button
            key={e.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => { setSelected(e); setDraft(e); setEditing(false); }}
            className="panel p-3 text-left flex flex-col gap-2 active:scale-[0.98] transition-transform"
          >
            <WikiImage src={e.image_url} alt={e.name} fallback={e.emoji} className="w-full h-28 p-2" />
            <div>
              <p className="font-display text-sm text-glow leading-tight">{e.name}</p>
              <DangerBar level={e.danger_level} />
            </div>
          </motion.button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-glow flex items-center gap-2">
                  <Skull className="h-5 w-5 text-destructive" /> {selected.name}
                </DialogTitle>
              </DialogHeader>

              <WikiImage src={selected.image_url} alt={selected.name} fallback={selected.emoji} className="w-full h-44 p-3" />

              {!editing ? (
                <div className="space-y-3 mt-2 text-sm">
                  <p className="text-muted-foreground">{selected.description}</p>
                  <DangerBar level={selected.danger_level} />

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Stat label="HP" value={String(selected.hp)} />
                    <Stat label="Danno" value={String(selected.damage)} />
                    <Stat label="Velocità" value={selected.speed ?? "—"} />
                    <Stat label="Habitat" value={selected.habitat ?? "—"} />
                    <Stat label="Mangia min" value={String(selected.pikmin_eat_min)} />
                    <Stat label="Mangia max" value={String(selected.pikmin_eat_max)} />
                    <Stat label="Probabilità spawn" value={`${Math.round((selected.spawn_probability ?? 0) * 100)}%`} />
                    <Stat label="Comportamento" value={selected.behavior ?? "—"} />
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Pikmin consigliati</p>
                    <div className="flex flex-wrap gap-1">
                      {(selected.recommended_pikmin ?? []).map((t) => (
                        <span key={t} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                          {PIKMIN_TYPE_EMOJI[t as PikminType] ?? "•"} {PIKMIN_TYPE_LABEL[t as PikminType] ?? t}
                        </span>
                      ))}
                      {(selected.recommended_pikmin ?? []).length === 0 && <p className="text-muted-foreground text-xs">—</p>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border text-[11px] text-muted-foreground">
                    Fonte:{" "}
                    {selected.source_url ? (
                      <a href={selected.source_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                        Pikipedia / PikminItalia <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      "Pikipedia / PikminItalia"
                    )}{" "}
                    · CC BY-SA
                  </div>

                  {isAdmin && (
                    <button onClick={() => setEditing(true)} className="btn-neon w-full py-2 text-xs flex items-center justify-center gap-1">
                      <Pencil className="h-3 w-3" /> Modifica scheda
                    </button>
                  )}
                </div>
              ) : (
                draft && (
                  <div className="space-y-2 mt-2 text-xs">
                    <EditField label="Nome" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
                    <ImageUploader
                      label="Immagine"
                      url={draft.image_url ?? ""}
                      onUrl={(v) => setDraft({ ...draft, image_url: v })}
                      pathHint={`${draft.id}`}
                    />
                    <EditField label="Descrizione" textarea value={draft.description ?? ""} onChange={(v) => setDraft({ ...draft, description: v })} />
                    <div className="grid grid-cols-2 gap-2">
                      <EditNumber label="Pericolosità (1-5)" value={draft.danger_level} onChange={(v) => setDraft({ ...draft, danger_level: Math.min(5, Math.max(1, v)) })} />
                      <EditNumber label="HP" value={draft.hp} onChange={(v) => setDraft({ ...draft, hp: v })} />
                      <EditNumber label="Danno" value={draft.damage} onChange={(v) => setDraft({ ...draft, damage: v })} />
                      <EditField label="Velocità" value={draft.speed ?? ""} onChange={(v) => setDraft({ ...draft, speed: v })} />
                      <EditField label="Habitat" value={draft.habitat ?? ""} onChange={(v) => setDraft({ ...draft, habitat: v })} />
                      <EditField label="Comportamento" value={draft.behavior ?? ""} onChange={(v) => setDraft({ ...draft, behavior: v })} />
                      <EditNumber label="Mangia min" value={draft.pikmin_eat_min} onChange={(v) => setDraft({ ...draft, pikmin_eat_min: v })} />
                      <EditNumber label="Mangia max" value={draft.pikmin_eat_max} onChange={(v) => setDraft({ ...draft, pikmin_eat_max: v })} />
                    </div>
                    <EditNumber
                      step={0.01}
                      label="Probabilità spawn (0-1)"
                      value={draft.spawn_probability}
                      onChange={(v) => setDraft({ ...draft, spawn_probability: Math.min(1, Math.max(0, v)) })}
                    />
                    <EditField
                      label="Pikmin consigliati (virgola: red,yellow,blue,...)"
                      value={(draft.recommended_pikmin ?? []).join(",")}
                      onChange={(v) => setDraft({ ...draft, recommended_pikmin: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                    />
                    <EditField label="URL fonte" value={draft.source_url ?? ""} onChange={(v) => setDraft({ ...draft, source_url: v })} />
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => { setEditing(false); setDraft(selected); }} className="flex-1 panel py-2 text-xs">Annulla</button>
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

      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-glow">Log battaglie</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {logs.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nessuna battaglia ancora.</p>}
            {logs.map((l) => (
              <div key={l.id} className="panel p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-glow text-sm">{l.enemy_name}</span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${l.result === "vittoria" ? "bg-emerald-500/20 text-emerald-300" : "bg-destructive/20 text-destructive"}`}>
                    {l.result}
                  </span>
                </div>
                <p className="text-muted-foreground">{l.summary}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(l.created_at).toLocaleString("it-IT")} · {l.agent}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function DangerBar({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Pericolosità</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-3 rounded-sm ${
              i < level
                ? level >= 4
                  ? "bg-destructive"
                  : level === 3
                    ? "bg-orange-400"
                    : "bg-yellow-400"
                : "bg-night/80 border border-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-2">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-foreground/90 mt-0.5">{value}</p>
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
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
          className="mt-1 w-full rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs outline-none focus:border-primary" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs outline-none focus:border-primary" />
      )}
    </label>
  );
}

function EditNumber({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type="number" step={step ?? 1} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs outline-none focus:border-primary" />
    </label>
  );
}
