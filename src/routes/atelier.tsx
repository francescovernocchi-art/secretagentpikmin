import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { IconUploader } from "@/components/IconUploader";
import { getSession } from "@/lib/session";
import { Plus, Save, Trash2, Skull, Sprout, Leaf, Rocket, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/atelier")({
  component: AtelierPage,
});

type Tab = "enemies" | "pikmin" | "ingredients" | "ship_parts";

const TABS: { id: Tab; label: string; icon: typeof Skull; folder: "enemies" | "pikmin" | "ingredients" | "ship-parts" }[] = [
  { id: "enemies", label: "Nemici", icon: Skull, folder: "enemies" },
  { id: "pikmin", label: "Pikmin", icon: Sprout, folder: "pikmin" },
  { id: "ingredients", label: "Ingredienti", icon: Leaf, folder: "ingredients" },
  { id: "ship_parts", label: "Pezzi Nave", icon: Rocket, folder: "ship-parts" },
];

function AtelierPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const isAdmin = session?.role === "papa";
  const [tab, setTab] = useState<Tab>("enemies");

  if (!isAdmin) {
    return (
      <PageShell title="Atelier" subtitle="Area riservata · solo Comandante">
        <div className="panel-strong p-6 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 mx-auto text-destructive" />
          <p className="font-display text-glow">Accesso negato</p>
          <p className="text-xs text-muted-foreground">
            Solo l'agente Comandante (papà) può modificare il bestiario, i pikmin, gli ingredienti e i pezzi della
            navicella.
          </p>
          <Link to="/base" className="btn-neon inline-block px-4 py-2 text-xs">Torna alla base</Link>
        </div>
      </PageShell>
    );
  }

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <PageShell title="Atelier" subtitle="Crea · Modifica · Icona di gioco">
      <div className="grid grid-cols-4 gap-1 panel p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] uppercase tracking-wider transition ${
                isActive ? "bg-primary/20 text-primary text-glow" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "enemies" && <EnemiesAdmin folder={active.folder as "enemies"} />}
      {tab === "pikmin" && <PikminAdmin folder={active.folder as "pikmin"} />}
      {tab === "ingredients" && <IngredientsAdmin folder={active.folder as "ingredients"} />}
      {tab === "ship_parts" && <ShipPartsAdmin folder={active.folder as "ship-parts"} />}
    </PageShell>
  );
}

/* ============================ ENEMIES ============================ */

type EnemyDraft = {
  id?: string;
  key: string;
  name: string;
  emoji: string;
  image_url: string;
  description: string;
  danger_level: number;
  habitat: string;
  behavior: string;
  speed: string;
  damage: number;
  hp: number;
  spawn_probability: number;
  pikmin_eat_min: number;
  pikmin_eat_max: number;
  recommended_pikmin: string[];
  source_url: string;
  activity_period: "diurno" | "notturno" | "crepuscolare" | "sempre";
};

const EMPTY_ENEMY: EnemyDraft = {
  key: "", name: "", emoji: "👾", image_url: "", description: "",
  danger_level: 1, habitat: "", behavior: "", speed: "", damage: 1, hp: 10,
  spawn_probability: 0.1, pikmin_eat_min: 1, pikmin_eat_max: 3, recommended_pikmin: [], source_url: "",
  activity_period: "sempre",
};

function EnemiesAdmin({ folder }: { folder: "enemies" }) {
  const [items, setItems] = useState<any[]>([]);
  const [draft, setDraft] = useState<EnemyDraft | null>(null);

  const load = async () => {
    const { data } = await (supabase as any).from("enemies").select("*").order("name");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.key || !draft.name) { alert("Chiave e nome obbligatori"); return; }
    const payload = { ...draft, updated_at: new Date().toISOString() };
    if (draft.id) {
      await (supabase as any).from("enemies").update(payload).eq("id", draft.id);
    } else {
      const { id, ...insertable } = payload as any;
      await (supabase as any).from("enemies").insert(insertable);
    }
    setDraft(null);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminare questo nemico?")) return;
    await (supabase as any).from("enemies").delete().eq("id", id);
    setDraft(null);
    await load();
  };

  return (
    <div className="space-y-3">
      <NewButton label="Nuovo nemico" onClick={() => setDraft({ ...EMPTY_ENEMY })} />
      <Grid items={items} onPick={(it) => setDraft({ ...EMPTY_ENEMY, ...it, image_url: it.image_url ?? "", description: it.description ?? "", habitat: it.habitat ?? "", behavior: it.behavior ?? "", speed: it.speed ?? "", source_url: it.source_url ?? "", recommended_pikmin: it.recommended_pikmin ?? [], activity_period: it.activity_period ?? "sempre" })} />
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-glow">{draft?.id ? "Modifica nemico" : "Nuovo nemico"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-2 text-xs">
              <IconUploader folder={folder} pathHint={draft.key || draft.name} url={draft.image_url} onUrl={(v) => setDraft({ ...draft, image_url: v })} />
              <Row><Field label="Chiave (unica)" value={draft.key} onChange={(v) => setDraft({ ...draft, key: v })} /><Field label="Emoji" value={draft.emoji} onChange={(v) => setDraft({ ...draft, emoji: v })} /></Row>
              <Field label="Nome" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <Field label="Descrizione" textarea value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
              <Row>
                <NumField label="Pericolosità" value={draft.danger_level} onChange={(v) => setDraft({ ...draft, danger_level: Math.min(5, Math.max(1, v)) })} />
                <NumField label="HP" value={draft.hp} onChange={(v) => setDraft({ ...draft, hp: v })} />
                <NumField label="Danno" value={draft.damage} onChange={(v) => setDraft({ ...draft, damage: v })} />
              </Row>
              <Row><Field label="Velocità" value={draft.speed} onChange={(v) => setDraft({ ...draft, speed: v })} /><Field label="Habitat" value={draft.habitat} onChange={(v) => setDraft({ ...draft, habitat: v })} /></Row>
              <Field label="Comportamento" value={draft.behavior} onChange={(v) => setDraft({ ...draft, behavior: v })} />
              <Row>
                <NumField label="Mangia min" value={draft.pikmin_eat_min} onChange={(v) => setDraft({ ...draft, pikmin_eat_min: v })} />
                <NumField label="Mangia max" value={draft.pikmin_eat_max} onChange={(v) => setDraft({ ...draft, pikmin_eat_max: v })} />
                <NumField step={0.05} label="Spawn (0-1)" value={draft.spawn_probability} onChange={(v) => setDraft({ ...draft, spawn_probability: Math.min(1, Math.max(0, v)) })} />
              </Row>
              <Field label="Pikmin consigliati (red,yellow,blue,...)" value={draft.recommended_pikmin.join(",")} onChange={(v) => setDraft({ ...draft, recommended_pikmin: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Periodo di attività</span>
                <select
                  value={draft.activity_period}
                  onChange={(e) => setDraft({ ...draft, activity_period: e.target.value as EnemyDraft["activity_period"] })}
                  className="mt-1 w-full rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs outline-none focus:border-primary"
                >
                  <option value="sempre">♾️ Sempre attivo</option>
                  <option value="diurno">☀️ Diurno (caccia di giorno, dorme di notte)</option>
                  <option value="notturno">🌙 Notturno (caccia di notte, dorme di giorno)</option>
                  <option value="crepuscolare">🌆 Crepuscolare (alba e tramonto)</option>
                </select>
              </label>
              <Field label="URL fonte" value={draft.source_url} onChange={(v) => setDraft({ ...draft, source_url: v })} />
              <SaveBar onSave={save} onDelete={draft.id ? () => remove(draft.id!) : undefined} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================ PIKMIN ============================ */

type PikminDraft = {
  id?: string;
  key: string;
  name: string;
  color: string;
  image_url: string;
  description: string;
  abilities: string[];
  resistances: string[];
  weaknesses: string[];
  first_appearance: string;
  exploration_use: string;
  combat_use: string;
  source_url: string;
  sort_order: number;
};
const EMPTY_PIK: PikminDraft = {
  key: "", name: "", color: "", image_url: "", description: "", abilities: [], resistances: [], weaknesses: [],
  first_appearance: "", exploration_use: "", combat_use: "", source_url: "", sort_order: 0,
};

function PikminAdmin({ folder }: { folder: "pikmin" }) {
  const [items, setItems] = useState<any[]>([]);
  const [draft, setDraft] = useState<PikminDraft | null>(null);
  const load = async () => {
    const { data } = await (supabase as any).from("pikmin_species").select("*").order("sort_order").order("name");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.key || !draft.name) { alert("Chiave e nome obbligatori"); return; }
    const payload = { ...draft, updated_at: new Date().toISOString() };
    if (draft.id) await (supabase as any).from("pikmin_species").update(payload).eq("id", draft.id);
    else { const { id, ...insertable } = payload as any; await (supabase as any).from("pikmin_species").insert(insertable); }
    setDraft(null);
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm("Eliminare questa specie?")) return;
    await (supabase as any).from("pikmin_species").delete().eq("id", id);
    setDraft(null);
    await load();
  };

  return (
    <div className="space-y-3">
      <NewButton label="Nuovo pikmin" onClick={() => setDraft({ ...EMPTY_PIK })} />
      <Grid items={items} onPick={(it) => setDraft({ ...EMPTY_PIK, ...it, image_url: it.image_url ?? "", description: it.description ?? "", color: it.color ?? "", first_appearance: it.first_appearance ?? "", exploration_use: it.exploration_use ?? "", combat_use: it.combat_use ?? "", source_url: it.source_url ?? "", abilities: it.abilities ?? [], resistances: it.resistances ?? [], weaknesses: it.weaknesses ?? [] })} />
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-glow">{draft?.id ? "Modifica pikmin" : "Nuovo pikmin"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-2 text-xs">
              <IconUploader folder={folder} pathHint={draft.key || draft.name} url={draft.image_url} onUrl={(v) => setDraft({ ...draft, image_url: v })} />
              <Row><Field label="Chiave (unica)" value={draft.key} onChange={(v) => setDraft({ ...draft, key: v })} /><Field label="Colore" value={draft.color} onChange={(v) => setDraft({ ...draft, color: v })} /></Row>
              <Field label="Nome" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <Field label="Descrizione" textarea value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
              <Field label="Abilità (virgola)" value={draft.abilities.join(",")} onChange={(v) => setDraft({ ...draft, abilities: v.split(",").map(s => s.trim()).filter(Boolean) })} />
              <Field label="Resistenze (virgola)" value={draft.resistances.join(",")} onChange={(v) => setDraft({ ...draft, resistances: v.split(",").map(s => s.trim()).filter(Boolean) })} />
              <Field label="Debolezze (virgola)" value={draft.weaknesses.join(",")} onChange={(v) => setDraft({ ...draft, weaknesses: v.split(",").map(s => s.trim()).filter(Boolean) })} />
              <Field label="Uso esplorazione" value={draft.exploration_use} onChange={(v) => setDraft({ ...draft, exploration_use: v })} />
              <Field label="Uso combattimento" value={draft.combat_use} onChange={(v) => setDraft({ ...draft, combat_use: v })} />
              <Row><Field label="Prima apparizione" value={draft.first_appearance} onChange={(v) => setDraft({ ...draft, first_appearance: v })} /><NumField label="Ordine" value={draft.sort_order} onChange={(v) => setDraft({ ...draft, sort_order: v })} /></Row>
              <Field label="URL fonte" value={draft.source_url} onChange={(v) => setDraft({ ...draft, source_url: v })} />
              <SaveBar onSave={save} onDelete={draft.id ? () => remove(draft.id!) : undefined} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================ INGREDIENTS ============================ */

type IngDraft = {
  originalKey?: string;
  key: string;
  name: string;
  emoji: string;
  rarity: string;
  color: string;
  source: string;
  price_coins: number | null;
  image_url: string;
};
const EMPTY_ING: IngDraft = { key: "", name: "", emoji: "🧪", rarity: "comune", color: "", source: "mission", price_coins: null, image_url: "" };

function IngredientsAdmin({ folder }: { folder: "ingredients" }) {
  const [items, setItems] = useState<any[]>([]);
  const [draft, setDraft] = useState<IngDraft | null>(null);
  const load = async () => {
    const { data } = await (supabase as any).from("ingredients").select("*").order("name");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.key || !draft.name) { alert("Chiave e nome obbligatori"); return; }
    const payload = { key: draft.key, name: draft.name, emoji: draft.emoji, rarity: draft.rarity, color: draft.color || null, source: draft.source, price_coins: draft.price_coins, image_url: draft.image_url || null };
    if (draft.originalKey) {
      await (supabase as any).from("ingredients").update(payload).eq("key", draft.originalKey);
    } else {
      await (supabase as any).from("ingredients").insert(payload);
    }
    setDraft(null);
    await load();
  };
  const remove = async (key: string) => {
    if (!confirm("Eliminare questo ingrediente? (potrebbe rompere ricette/inventari)")) return;
    const { error } = await (supabase as any).from("ingredients").delete().eq("key", key);
    if (error) { alert(error.message); return; }
    setDraft(null);
    await load();
  };

  return (
    <div className="space-y-3">
      <NewButton label="Nuovo ingrediente" onClick={() => setDraft({ ...EMPTY_ING })} />
      <Grid items={items.map(i => ({ ...i, id: i.key }))} onPick={(it) => setDraft({ originalKey: it.key, key: it.key, name: it.name, emoji: it.emoji, rarity: it.rarity, color: it.color ?? "", source: it.source, price_coins: it.price_coins, image_url: it.image_url ?? "" })} />
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-glow">{draft?.originalKey ? "Modifica ingrediente" : "Nuovo ingrediente"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-2 text-xs">
              <IconUploader folder={folder} pathHint={draft.key || draft.name} url={draft.image_url} onUrl={(v) => setDraft({ ...draft, image_url: v })} />
              <Row><Field label="Chiave (unica)" value={draft.key} onChange={(v) => setDraft({ ...draft, key: v })} /><Field label="Emoji" value={draft.emoji} onChange={(v) => setDraft({ ...draft, emoji: v })} /></Row>
              <Field label="Nome" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <Row>
                <Field label="Rarità (comune/raro/leggendario)" value={draft.rarity} onChange={(v) => setDraft({ ...draft, rarity: v })} />
                <Field label="Colore" value={draft.color} onChange={(v) => setDraft({ ...draft, color: v })} />
              </Row>
              <Row>
                <Field label="Fonte (mission/radar/...)" value={draft.source} onChange={(v) => setDraft({ ...draft, source: v })} />
                <NumField label="Prezzo coin" value={draft.price_coins ?? 0} onChange={(v) => setDraft({ ...draft, price_coins: v })} />
              </Row>
              <SaveBar onSave={save} onDelete={draft.originalKey ? () => remove(draft.originalKey!) : undefined} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================ SHIP PARTS ============================ */

type PartDraft = {
  id?: string;
  key: string;
  name: string;
  emoji: string;
  description: string;
  rarity: string;
  sort_order: number;
  image_url: string;
};
const EMPTY_PART: PartDraft = { key: "", name: "", emoji: "🛠️", description: "", rarity: "comune", sort_order: 0, image_url: "" };

function ShipPartsAdmin({ folder }: { folder: "ship-parts" }) {
  const [items, setItems] = useState<any[]>([]);
  const [draft, setDraft] = useState<PartDraft | null>(null);
  const load = async () => {
    const { data } = await (supabase as any).from("ship_parts").select("*").order("sort_order").order("name");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.key || !draft.name) { alert("Chiave e nome obbligatori"); return; }
    const payload: any = { key: draft.key, name: draft.name, emoji: draft.emoji, description: draft.description || null, rarity: draft.rarity, sort_order: draft.sort_order, image_url: draft.image_url || null };
    if (draft.id) await (supabase as any).from("ship_parts").update(payload).eq("id", draft.id);
    else await (supabase as any).from("ship_parts").insert(payload);
    setDraft(null);
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm("Eliminare questo pezzo?")) return;
    const { error } = await (supabase as any).from("ship_parts").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    setDraft(null);
    await load();
  };

  return (
    <div className="space-y-3">
      <NewButton label="Nuovo pezzo nave" onClick={() => setDraft({ ...EMPTY_PART })} />
      <Grid items={items} onPick={(it) => setDraft({ id: it.id, key: it.key, name: it.name, emoji: it.emoji, description: it.description ?? "", rarity: it.rarity, sort_order: it.sort_order, image_url: it.image_url ?? "" })} />
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-glow">{draft?.id ? "Modifica pezzo" : "Nuovo pezzo"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-2 text-xs">
              <IconUploader folder={folder} pathHint={draft.key || draft.name} url={draft.image_url} onUrl={(v) => setDraft({ ...draft, image_url: v })} />
              <Row><Field label="Chiave (unica)" value={draft.key} onChange={(v) => setDraft({ ...draft, key: v })} /><Field label="Emoji" value={draft.emoji} onChange={(v) => setDraft({ ...draft, emoji: v })} /></Row>
              <Field label="Nome" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <Field label="Descrizione" textarea value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
              <Row>
                <Field label="Rarità" value={draft.rarity} onChange={(v) => setDraft({ ...draft, rarity: v })} />
                <NumField label="Ordine" value={draft.sort_order} onChange={(v) => setDraft({ ...draft, sort_order: v })} />
              </Row>
              <SaveBar onSave={save} onDelete={draft.id ? () => remove(draft.id!) : undefined} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================ Shared bits ============================ */

function NewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-neon w-full py-2.5 text-xs flex items-center justify-center gap-2">
      <Plus className="h-4 w-4" /> {label}
    </button>
  );
}

function Grid({ items, onPick }: { items: any[]; onPick: (it: any) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it, i) => (
        <motion.button
          key={it.id ?? it.key ?? i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.02 }}
          onClick={() => onPick(it)}
          className="panel p-2 flex flex-col items-center gap-1 text-center active:scale-[0.97] transition"
        >
          <div className="h-14 w-14 rounded-lg bg-night/60 border border-border flex items-center justify-center overflow-hidden">
            {it.image_url ? (
              <img src={it.image_url} alt={it.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-2xl">{it.emoji ?? "•"}</span>
            )}
          </div>
          <p className="text-[10px] leading-tight truncate w-full">{it.name}</p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70 truncate w-full">{it.key}</p>
        </motion.button>
      ))}
      {items.length === 0 && (
        <p className="col-span-3 text-center text-xs text-muted-foreground py-6">Nessun elemento ancora.</p>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
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

function NumField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type="number" step={step ?? 1} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs outline-none focus:border-primary" />
    </label>
  );
}

function SaveBar({ onSave, onDelete }: { onSave: () => void; onDelete?: () => void }) {
  return (
    <div className="flex gap-2 pt-2">
      {onDelete && (
        <button onClick={onDelete} className="panel py-2 px-3 text-xs text-destructive flex items-center gap-1">
          <Trash2 className="h-3 w-3" /> Elimina
        </button>
      )}
      <button onClick={onSave} className="flex-1 btn-neon py-2 text-xs flex items-center justify-center gap-1">
        <Save className="h-3 w-3" /> Salva
      </button>
    </div>
  );
}
