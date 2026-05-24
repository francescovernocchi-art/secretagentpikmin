import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAsset } from "@/lib/admin-upload";
import { toast } from "sonner";
import { Upload, Save, Trash2 } from "lucide-react";

interface Enemy {
  id: string;
  key: string;
  name: string;
  emoji: string;
  image_url: string | null;
  description: string | null;
  danger_level: number;
  habitat: string | null;
  hp: number;
  damage: number;
}

/** Editor mostri/nemici: nome, emoji fallback, immagine custom, danno/HP. */
export function MonstersEditor() {
  const [list, setList] = useState<Enemy[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    const { data } = await supabase
      .from("enemies")
      .select("id,key,name,emoji,image_url,description,danger_level,habitat,hp,damage")
      .order("danger_level", { ascending: true });
    setList((data ?? []) as Enemy[]);
  };
  useEffect(() => { reload(); }, []);

  const patch = (id: string, p: Partial<Enemy>) =>
    setList((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const save = async (e: Enemy) => {
    setBusy(e.id);
    const { error } = await supabase.from("enemies").update({
      name: e.name, emoji: e.emoji, image_url: e.image_url, description: e.description,
      danger_level: e.danger_level, habitat: e.habitat, hp: e.hp, damage: e.damage,
    }).eq("id", e.id);
    setBusy(null);
    if (error) toast.error(error.message); else toast.success("Salvato");
  };

  const upload = async (e: Enemy, file: File) => {
    setBusy(e.id);
    try {
      const url = await uploadAsset("enemy-images", file, e.key);
      patch(e.id, { image_url: url });
      await supabase.from("enemies").update({ image_url: url }).eq("id", e.id);
      toast.success("Immagine caricata");
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(null); }
  };

  const addNew = async () => {
    const key = prompt("Chiave mostro (es. bulborb)");
    if (!key) return;
    const { error } = await supabase.from("enemies").insert({ key, name: key, emoji: "👾" });
    if (error) toast.error(error.message); else reload();
  };

  const remove = async (e: Enemy) => {
    if (!confirm(`Eliminare "${e.name}"?`)) return;
    const { error } = await supabase.from("enemies").delete().eq("id", e.id);
    if (error) toast.error(error.message); else reload();
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground panel p-2">
        Carica un'immagine per ogni mostro. Se assente verrà usata l'emoji come fallback.
      </p>
      <button onClick={addNew} className="panel-strong p-2 text-xs self-start">+ Nuovo mostro</button>

      {list.map((e) => (
        <div key={e.id} className="panel-strong p-3 flex gap-3 items-start">
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 panel flex items-center justify-center overflow-hidden">
              {e.image_url
                ? <img src={e.image_url} alt={e.name} className="w-full h-full object-contain" />
                : <span className="text-2xl">{e.emoji}</span>}
            </div>
            <label className="text-[10px] panel px-2 py-1 cursor-pointer">
              <Upload className="h-3 w-3 inline mr-1" />{busy === e.id ? "…" : "Carica"}
              <input type="file" accept="image/*" className="hidden"
                onChange={(ev) => ev.target.files?.[0] && upload(e, ev.target.files[0])} />
            </label>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
            <label>Chiave<input className="w-full input" value={e.key} disabled /></label>
            <label>Nome<input className="w-full input" value={e.name}
              onChange={(ev) => patch(e.id, { name: ev.target.value })} /></label>
            <label>Emoji<input className="w-full input" value={e.emoji}
              onChange={(ev) => patch(e.id, { emoji: ev.target.value })} /></label>
            <label>Pericolo<input type="number" min={1} max={10} className="w-full input" value={e.danger_level}
              onChange={(ev) => patch(e.id, { danger_level: Number(ev.target.value) })} /></label>
            <label>HP<input type="number" className="w-full input" value={e.hp}
              onChange={(ev) => patch(e.id, { hp: Number(ev.target.value) })} /></label>
            <label>Danno<input type="number" className="w-full input" value={e.damage}
              onChange={(ev) => patch(e.id, { damage: Number(ev.target.value) })} /></label>
            <label className="col-span-2">Habitat<input className="w-full input" value={e.habitat ?? ""}
              onChange={(ev) => patch(e.id, { habitat: ev.target.value })} /></label>
            <label className="col-span-2">Descrizione<textarea className="w-full input" rows={2} value={e.description ?? ""}
              onChange={(ev) => patch(e.id, { description: ev.target.value })} /></label>
            <button onClick={() => save(e)} disabled={busy === e.id}
              className="panel-strong p-2 flex items-center justify-center gap-1 text-xs">
              <Save className="h-3 w-3" /> Salva
            </button>
            <button onClick={() => remove(e)} className="panel p-2 flex items-center justify-center gap-1 text-xs text-destructive">
              <Trash2 className="h-3 w-3" /> Elimina
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
