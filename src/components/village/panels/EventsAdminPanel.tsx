import { useState } from "react";
import { Sparkles, Plus, Trash2, Upload } from "lucide-react";
import { VillagePanelSheet } from "./VillagePanelSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAllVillageEvents } from "@/hooks/useVillageEvents";
import { getAllBiomes } from "@/lib/village/biomes";
import {
  EVENT_TYPE_LABEL, EVENT_TYPE_ICON, EVENT_TYPE_PRESET,
  type VillageEventType, type VillageEventRow,
} from "@/lib/village/eventTypes";
import { BONUS_LABEL, type BonusKey } from "@/lib/village/bonuses";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; onChanged?: () => void; }

const BONUS_KEYS: BonusKey[] = ["energy_max", "defense", "pikmin_per_hour", "scan_range", "storage"];

export function EventsAdminPanel({ open, onOpenChange, onChanged }: Props) {
  const { events, reload } = useAllVillageEvents();
  const biomes = getAllBiomes();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Partial<VillageEventRow> | null>(null);

  const startNew = () => setEditing({
    key: "", name: "", event_type: "custom", biome_key: null,
    description: "", icon: "✨", overlay_image_url: null,
    effects: {}, bonuses: [], maluses: [],
    priority: 50, duration_minutes: 60, is_active: false,
  });

  const applyPreset = (t: VillageEventType) => {
    if (!editing) return;
    setEditing({ ...editing, event_type: t, icon: EVENT_TYPE_ICON[t], effects: EVENT_TYPE_PRESET[t] });
  };

  const upload = async (file: File) => {
    if (!editing) return;
    setBusy(true);
    const path = `events/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("village-dioramas").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("village-dioramas").getPublicUrl(path);
      setEditing({ ...editing, overlay_image_url: data.publicUrl });
    }
    setBusy(false);
  };

  const save = async () => {
    if (!editing?.key || !editing.name) return;
    setBusy(true);
    const session = (await supabase.auth.getSession()).data.session;
    const payload: any = {
      key: editing.key, name: editing.name,
      event_type: editing.event_type ?? "custom",
      biome_key: editing.biome_key || null,
      description: editing.description ?? null,
      icon: editing.icon ?? "✨",
      overlay_image_url: editing.overlay_image_url ?? null,
      effects: editing.effects ?? {},
      bonuses: editing.bonuses ?? [],
      maluses: editing.maluses ?? [],
      priority: editing.priority ?? 50,
      duration_minutes: editing.duration_minutes ?? 60,
      is_active: editing.is_active ?? false,
      created_by: session?.user.id,
    };
    if (editing.id) {
      await supabase.from("village_diorama_events").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("village_diorama_events").insert(payload);
    }
    setEditing(null);
    setBusy(false);
    reload(); onChanged?.();
  };

  const toggleActive = async (ev: VillageEventRow) => {
    const ends = !ev.is_active && ev.duration_minutes
      ? new Date(Date.now() + ev.duration_minutes * 60_000).toISOString() : null;
    await supabase.from("village_diorama_events")
      .update({ is_active: !ev.is_active, starts_at: !ev.is_active ? new Date().toISOString() : null, ends_at: ends })
      .eq("id", ev.id);
    reload(); onChanged?.();
  };

  const remove = async (ev: VillageEventRow) => {
    if (!confirm(`Eliminare l'evento "${ev.name}"?`)) return;
    await supabase.from("village_diorama_events").delete().eq("id", ev.id);
    reload(); onChanged?.();
  };

  const setBonus = (idx: number, patch: any) => {
    if (!editing) return;
    const arr = [...(editing.bonuses ?? [])];
    arr[idx] = { ...arr[idx], ...patch };
    setEditing({ ...editing, bonuses: arr });
  };
  const addBonus = () => {
    if (!editing) return;
    setEditing({ ...editing, bonuses: [...(editing.bonuses ?? []), { key: "energy_max", amount: 0 }] });
  };
  const removeBonus = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, bonuses: (editing.bonuses ?? []).filter((_, i) => i !== idx) });
  };

  return (
    <VillagePanelSheet open={open} onOpenChange={onOpenChange}
      title="Eventi del Villaggio" icon={<Sparkles className="h-4 w-4 text-amber-400" />}>
      {!editing && (
        <div className="space-y-3">
          <button onClick={startNew} className="btn-neon w-full py-2 text-xs inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> Nuovo evento
          </button>
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4 panel">Nessun evento configurato.</p>
          )}
          {events.map((ev) => (
            <div key={ev.id} className="panel p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">{ev.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{ev.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {EVENT_TYPE_LABEL[ev.event_type as VillageEventType] ?? ev.event_type}
                    {ev.biome_key ? ` · ${ev.biome_key}` : " · tutti i biomi"}
                  </p>
                </div>
                <button onClick={() => toggleActive(ev)}
                  className={`px-2 py-1 rounded text-[10px] border ${ev.is_active ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "border-muted-foreground/30"}`}>
                  {ev.is_active ? "Attivo" : "Off"}
                </button>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setEditing(ev)} className="btn-neon flex-1 py-1 text-[10px]">Modifica</button>
                <button onClick={() => remove(ev)} className="px-2 py-1 rounded border border-rose-500/40 text-rose-400">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="space-y-3 text-[11px]">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-primary">Chiave</span>
              <input value={editing.key ?? ""} onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                className="w-full bg-night/60 border border-primary/30 rounded px-2 py-1" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-primary">Icona</span>
              <input value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                className="w-full bg-night/60 border border-primary/30 rounded px-2 py-1" />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="text-[10px] uppercase text-primary">Nome</span>
            <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full bg-night/60 border border-primary/30 rounded px-2 py-1" />
          </label>
          <label className="space-y-1 block">
            <span className="text-[10px] uppercase text-primary">Descrizione</span>
            <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="w-full bg-night/60 border border-primary/30 rounded px-2 py-1" rows={2} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-primary">Tipo</span>
              <select value={editing.event_type ?? "custom"}
                onChange={(e) => applyPreset(e.target.value as VillageEventType)}
                className="w-full bg-night/60 border border-primary/30 rounded px-2 py-1">
                {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-primary">Bioma</span>
              <select value={editing.biome_key ?? ""}
                onChange={(e) => setEditing({ ...editing, biome_key: e.target.value || null })}
                className="w-full bg-night/60 border border-primary/30 rounded px-2 py-1">
                <option value="">Tutti</option>
                {biomes.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-primary">Durata (min)</span>
              <input type="number" value={editing.duration_minutes ?? 60}
                onChange={(e) => setEditing({ ...editing, duration_minutes: Number(e.target.value) })}
                className="w-full bg-night/60 border border-primary/30 rounded px-2 py-1" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-primary">Priorità</span>
              <input type="number" value={editing.priority ?? 50}
                onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                className="w-full bg-night/60 border border-primary/30 rounded px-2 py-1" />
            </label>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase text-primary">Overlay immagine (opzionale)</span>
            <label className="btn-neon w-full py-2 inline-flex items-center justify-center gap-2 cursor-pointer text-[10px]">
              <Upload className="h-3 w-3" />
              {editing.overlay_image_url ? "Cambia immagine" : "Carica immagine"}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
            </label>
            {editing.overlay_image_url && (
              <img src={editing.overlay_image_url} alt="" className="w-full h-20 object-cover rounded border border-primary/20" />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-primary">Bonus/Malus temporanei</span>
              <button onClick={addBonus} className="text-[10px] text-primary inline-flex items-center gap-1">
                <Plus className="h-3 w-3" /> Aggiungi
              </button>
            </div>
            {(editing.bonuses ?? []).map((b, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <select value={b.key} onChange={(e) => setBonus(i, { key: e.target.value })}
                  className="flex-1 bg-night/60 border border-primary/30 rounded px-1 py-1 text-[10px]">
                  {BONUS_KEYS.map((k) => <option key={k} value={k}>{BONUS_LABEL[k]}</option>)}
                </select>
                <input type="number" value={b.amount}
                  onChange={(e) => setBonus(i, { amount: Number(e.target.value) })}
                  className="w-16 bg-night/60 border border-primary/30 rounded px-1 py-1" />
                <button onClick={() => removeBonus(i)} className="text-rose-400 px-1">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <p className="text-[9px] text-muted-foreground italic">Valori positivi = bonus, negativi = malus.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditing(null)} className="flex-1 py-2 text-xs panel">Annulla</button>
            <button disabled={busy || !editing.key || !editing.name}
              onClick={save} className="flex-1 btn-neon py-2 text-xs disabled:opacity-50">
              {busy ? "Salvo…" : "Salva"}
            </button>
          </div>
        </div>
      )}
    </VillagePanelSheet>
  );
}
