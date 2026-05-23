import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";

interface Tpl {
  key: string;
  title: string;
  description: string | null;
  biome: string;
  difficulty: string;
  duration_minutes: number;
  pikmin_min: number;
  pikmin_recommended: number;
  pikmin_max: number;
  recommended_types: string[];
  rewards_pool: any;
  sort_order: number;
}

export function MissionsEditor() {
  const [list, setList] = useState<Tpl[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    const { data } = await supabase.from("mission_templates").select("*").order("sort_order");
    setList((data ?? []) as Tpl[]);
  };
  useEffect(() => { reload(); }, []);

  const update = (key: string, patch: Partial<Tpl>) => setList((p) => p.map((t) => t.key === key ? { ...t, ...patch } : t));

  const save = async (t: Tpl) => {
    setBusy(t.key);
    const { error } = await supabase.from("mission_templates").update({
      title: t.title, description: t.description, biome: t.biome, difficulty: t.difficulty,
      duration_minutes: t.duration_minutes, pikmin_min: t.pikmin_min, pikmin_recommended: t.pikmin_recommended,
      pikmin_max: t.pikmin_max, recommended_types: t.recommended_types, rewards_pool: t.rewards_pool, sort_order: t.sort_order,
    }).eq("key", t.key);
    setBusy(null);
    if (error) toast.error(error.message); else toast.success("Missione salvata");
  };

  const addNew = async () => {
    const key = prompt("Chiave missione");
    if (!key) return;
    const title = prompt("Titolo") ?? key;
    const { error } = await supabase.from("mission_templates").insert({ key, title, biome: "foresta", difficulty: "facile", duration_minutes: 15 });
    if (error) toast.error(error.message); else reload();
  };

  const del = async (key: string) => {
    if (!confirm("Eliminare?")) return;
    await supabase.from("mission_templates").delete().eq("key", key);
    reload();
  };

  return (
    <div className="flex flex-col gap-3">
      <button onClick={addNew} className="panel-strong p-2 text-xs self-start">+ Nuova missione</button>
      {list.map((t) => (
        <div key={t.key} className="panel-strong p-3 grid grid-cols-2 gap-2 text-xs">
          <label className="col-span-2">Titolo<input className="input" value={t.title} onChange={(e) => update(t.key, { title: e.target.value })} /></label>
          <label className="col-span-2">Descrizione<textarea className="input" rows={2} value={t.description ?? ""} onChange={(e) => update(t.key, { description: e.target.value })} /></label>
          <label>Bioma<input className="input" value={t.biome} onChange={(e) => update(t.key, { biome: e.target.value })} /></label>
          <label>Difficoltà
            <select className="input" value={t.difficulty} onChange={(e) => update(t.key, { difficulty: e.target.value })}>
              <option value="facile">Facile</option><option value="medio">Medio</option><option value="difficile">Difficile</option><option value="epico">Epico</option>
            </select>
          </label>
          <label>Durata (min)<input type="number" className="input" value={t.duration_minutes} onChange={(e) => update(t.key, { duration_minutes: Number(e.target.value) })} /></label>
          <label>Ordine<input type="number" className="input" value={t.sort_order} onChange={(e) => update(t.key, { sort_order: Number(e.target.value) })} /></label>
          <label>Pikmin min<input type="number" className="input" value={t.pikmin_min} onChange={(e) => update(t.key, { pikmin_min: Number(e.target.value) })} /></label>
          <label>Pikmin cons.<input type="number" className="input" value={t.pikmin_recommended} onChange={(e) => update(t.key, { pikmin_recommended: Number(e.target.value) })} /></label>
          <label className="col-span-2">Pikmin max<input type="number" className="input" value={t.pikmin_max} onChange={(e) => update(t.key, { pikmin_max: Number(e.target.value) })} /></label>
          <label className="col-span-2">Tipi consigliati (csv: red,blue,...)<input className="input" value={t.recommended_types.join(",")} onChange={(e) => update(t.key, { recommended_types: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
          <label className="col-span-2">Pool ricompense (JSON)<textarea className="input font-mono" rows={3} value={JSON.stringify(t.rewards_pool, null, 2)} onChange={(e) => {
            try { update(t.key, { rewards_pool: JSON.parse(e.target.value) }); } catch {/* ignora finché non è valido */}
          }} /></label>
          <button onClick={() => save(t)} disabled={busy === t.key} className="panel-strong p-1.5 flex items-center justify-center gap-1"><Save className="h-3 w-3" />Salva</button>
          <button onClick={() => del(t.key)} className="panel p-1.5 text-rose-400 flex items-center justify-center gap-1"><Trash2 className="h-3 w-3" />Elimina</button>
        </div>
      ))}
    </div>
  );
}
