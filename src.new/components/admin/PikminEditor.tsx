import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAsset } from "@/lib/admin-upload";
import { invalidatePikminCache } from "@/components/PikminAvatar";
import { toast } from "sonner";
import { Upload, Save } from "lucide-react";

interface Species {
  id: string;
  key: string;
  name: string;
  color: string | null;
  image_url: string | null;
  icon_url: string | null;
  sprite_idle_url: string | null;
  sprite_walk_url: string | null;
  sprite_sleep_url: string | null;
  sprite_attack_url: string | null;
  description: string | null;
  abilities: string[];
  resistances: string[];
  weaknesses: string[];
  combat_use: string | null;
  exploration_use: string | null;
  sort_order: number;
}

type SpriteSlot = "icon_url" | "image_url" | "sprite_idle_url" | "sprite_walk_url" | "sprite_sleep_url" | "sprite_attack_url";

const SPRITE_SLOTS: { key: SpriteSlot; label: string; emoji: string }[] = [
  { key: "icon_url", label: "Icona", emoji: "🪪" },
  { key: "image_url", label: "Ritratto", emoji: "🖼️" },
  { key: "sprite_idle_url", label: "Idle", emoji: "🧍" },
  { key: "sprite_walk_url", label: "Cammina", emoji: "🚶" },
  { key: "sprite_sleep_url", label: "Dorme", emoji: "💤" },
  { key: "sprite_attack_url", label: "Attacca", emoji: "⚔️" },
];

export function PikminEditor() {
  const [list, setList] = useState<Species[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    const { data } = await supabase.from("pikmin_species").select("*").order("sort_order");
    setList((data ?? []) as Species[]);
    invalidatePikminCache();
  };
  useEffect(() => { reload(); }, []);

  const update = (id: string, patch: Partial<Species>) => {
    setList((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const save = async (s: Species) => {
    setBusy(s.id);
    const { error } = await supabase.from("pikmin_species").update({
      name: s.name, color: s.color, image_url: s.image_url, description: s.description,
      abilities: s.abilities, resistances: s.resistances, weaknesses: s.weaknesses,
      combat_use: s.combat_use, exploration_use: s.exploration_use, sort_order: s.sort_order,
      icon_url: s.icon_url,
      sprite_idle_url: s.sprite_idle_url,
      sprite_walk_url: s.sprite_walk_url,
      sprite_sleep_url: s.sprite_sleep_url,
      sprite_attack_url: s.sprite_attack_url,
    } as any).eq("id", s.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success("Salvato"); invalidatePikminCache(); }
  };

  const onUpload = async (s: Species, slot: SpriteSlot, file: File) => {
    setBusy(s.id + slot);
    try {
      const url = await uploadAsset("pikmin-images", file, `${s.key}-${slot}`);
      update(s.id, { [slot]: url } as Partial<Species>);
      await supabase.from("pikmin_species").update({ [slot]: url } as any).eq("id", s.id);
      invalidatePikminCache();
      toast.success(`${slot} caricato`);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(null); }
  };

  const clearSlot = async (s: Species, slot: SpriteSlot) => {
    update(s.id, { [slot]: null } as Partial<Species>);
    await supabase.from("pikmin_species").update({ [slot]: null } as any).eq("id", s.id);
    invalidatePikminCache();
  };

  const addNew = async () => {
    const key = prompt("Chiave specie (es. red, blue, rock)");
    if (!key) return;
    const { error } = await supabase.from("pikmin_species").insert({
      key, name: key, abilities: [], resistances: [], weaknesses: [],
    });
    if (error) toast.error(error.message); else reload();
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground panel p-2">
        Per ciascun Pikmin puoi caricare <b>icona</b>, <b>ritratto</b> e gli sprite delle animazioni
        (Idle, Cammina, Dorme, Attacca). Se uno slot è vuoto verrà usato il disegno SVG di fallback.
      </p>
      <button onClick={addNew} className="panel-strong p-2 text-xs self-start">+ Nuova specie</button>

      {list.map((s) => (
        <div key={s.id} className="panel-strong p-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <label className="col-span-1">Chiave<input className="w-full input" value={s.key} disabled /></label>
            <label className="col-span-1">Nome<input className="w-full input" value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} /></label>
            <label className="col-span-1">Colore<input className="w-full input" value={s.color ?? ""} onChange={(e) => update(s.id, { color: e.target.value })} placeholder="#ff0000" /></label>
            <label className="col-span-1">Ordine<input type="number" className="w-full input" value={s.sort_order} onChange={(e) => update(s.id, { sort_order: Number(e.target.value) })} /></label>
            <label className="col-span-full">Descrizione<textarea className="w-full input" rows={2} value={s.description ?? ""} onChange={(e) => update(s.id, { description: e.target.value })} /></label>
          </div>

          {/* Sprite slot grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {SPRITE_SLOTS.map((slot) => {
              const url = s[slot.key] as string | null;
              const busyKey = s.id + slot.key;
              return (
                <div key={slot.key} className="flex flex-col items-center gap-1 panel p-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {slot.emoji} {slot.label}
                  </div>
                  <div className="w-full aspect-square bg-black/30 flex items-center justify-center overflow-hidden rounded">
                    {url
                      ? <img src={url} alt={slot.label} className="w-full h-full object-contain" />
                      : <span className="text-xl opacity-40">{slot.emoji}</span>}
                  </div>
                  <label className="text-[9px] panel-strong px-2 py-0.5 cursor-pointer w-full text-center">
                    <Upload className="h-2.5 w-2.5 inline" /> {busy === busyKey ? "…" : "Carica"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && onUpload(s, slot.key, e.target.files[0])} />
                  </label>
                  {url && (
                    <button onClick={() => clearSlot(s, slot.key)} className="text-[9px] text-destructive hover:underline">
                      rimuovi
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <label className="col-span-1">Abilità (csv)<input className="w-full input" value={s.abilities.join(",")} onChange={(e) => update(s.id, { abilities: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
            <label className="col-span-1">Resistenze (csv)<input className="w-full input" value={s.resistances.join(",")} onChange={(e) => update(s.id, { resistances: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
            <label className="col-span-1">Debolezze (csv)<input className="w-full input" value={s.weaknesses.join(",")} onChange={(e) => update(s.id, { weaknesses: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
            <label className="col-span-1">Uso combat<input className="w-full input" value={s.combat_use ?? ""} onChange={(e) => update(s.id, { combat_use: e.target.value })} /></label>
            <label className="col-span-2">Uso esplorazione<input className="w-full input" value={s.exploration_use ?? ""} onChange={(e) => update(s.id, { exploration_use: e.target.value })} /></label>
          </div>

          <button onClick={() => save(s)} disabled={busy === s.id}
            className="panel-strong p-2 flex items-center justify-center gap-1 text-xs">
            <Save className="h-3 w-3" /> {busy === s.id ? "Salvo…" : "Salva tutto"}
          </button>
        </div>
      ))}
    </div>
  );
}
