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
  description: string | null;
  abilities: string[];
  resistances: string[];
  weaknesses: string[];
  combat_use: string | null;
  exploration_use: string | null;
  sort_order: number;
}

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
    }).eq("id", s.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success("Salvato"); invalidatePikminCache(); }
  };

  const onUpload = async (s: Species, file: File) => {
    setBusy(s.id);
    try {
      const url = await uploadAsset("pikmin-images", file, s.key);
      update(s.id, { image_url: url });
      await supabase.from("pikmin_species").update({ image_url: url }).eq("id", s.id);
      invalidatePikminCache();
      toast.success("Immagine caricata");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(null); }
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
      <button onClick={addNew} className="panel-strong p-2 text-xs self-start">+ Nuova specie</button>
      {list.map((s) => (
        <div key={s.id} className="panel-strong p-3 flex gap-3 items-start">
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 panel flex items-center justify-center overflow-hidden">
              {s.image_url ? <img src={s.image_url} alt={s.name} className="w-full h-full object-contain" /> : <span className="text-2xl">🌱</span>}
            </div>
            <label className="text-[10px] panel px-2 py-1 cursor-pointer">
              <Upload className="h-3 w-3 inline mr-1" />Carica
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(s, e.target.files[0])} />
            </label>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
            <label className="col-span-1">Chiave<input className="w-full input" value={s.key} disabled /></label>
            <label className="col-span-1">Nome<input className="w-full input" value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} /></label>
            <label className="col-span-1">Colore<input className="w-full input" value={s.color ?? ""} onChange={(e) => update(s.id, { color: e.target.value })} placeholder="#ff0000" /></label>
            <label className="col-span-1">Ordine<input type="number" className="w-full input" value={s.sort_order} onChange={(e) => update(s.id, { sort_order: Number(e.target.value) })} /></label>
            <label className="col-span-2">Descrizione<textarea className="w-full input" rows={2} value={s.description ?? ""} onChange={(e) => update(s.id, { description: e.target.value })} /></label>
            <label className="col-span-1">Abilità (csv)<input className="w-full input" value={s.abilities.join(",")} onChange={(e) => update(s.id, { abilities: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
            <label className="col-span-1">Resistenze (csv)<input className="w-full input" value={s.resistances.join(",")} onChange={(e) => update(s.id, { resistances: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
            <label className="col-span-1">Debolezze (csv)<input className="w-full input" value={s.weaknesses.join(",")} onChange={(e) => update(s.id, { weaknesses: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
            <label className="col-span-1">Uso combat<input className="w-full input" value={s.combat_use ?? ""} onChange={(e) => update(s.id, { combat_use: e.target.value })} /></label>
            <label className="col-span-2">Uso esplorazione<input className="w-full input" value={s.exploration_use ?? ""} onChange={(e) => update(s.id, { exploration_use: e.target.value })} /></label>
            <button onClick={() => save(s)} disabled={busy === s.id} className="col-span-2 panel-strong p-2 flex items-center justify-center gap-1 text-xs">
              <Save className="h-3 w-3" /> {busy === s.id ? "Salvo…" : "Salva"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
