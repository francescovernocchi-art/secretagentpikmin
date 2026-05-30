import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAsset } from "@/lib/admin-upload";
import { toast } from "sonner";
import { Upload, Save, Trash2 } from "lucide-react";

interface Part {
  id: string;
  key: string;
  name: string;
  emoji: string;
  description: string | null;
  image_url: string | null;
  rarity: string;
  sort_order: number;
}

export function RewardsEditor() {
  const [parts, setParts] = useState<Part[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    const { data } = await supabase.from("ship_parts").select("*").order("sort_order");
    setParts((data ?? []) as Part[]);
  };
  useEffect(() => { reload(); }, []);

  const update = (id: string, patch: Partial<Part>) => setParts((p) => p.map((c) => c.id === id ? { ...c, ...patch } : c));

  const save = async (p: Part) => {
    setBusy(p.id);
    const { error } = await supabase.from("ship_parts").update({
      name: p.name, emoji: p.emoji, description: p.description, image_url: p.image_url, rarity: p.rarity, sort_order: p.sort_order,
    }).eq("id", p.id);
    setBusy(null);
    if (error) toast.error(error.message); else toast.success("Pezzo salvato");
  };

  const onUpload = async (p: Part, file: File) => {
    setBusy(p.id);
    try {
      const url = await uploadAsset("reward-images", file, p.key);
      update(p.id, { image_url: url });
      await supabase.from("ship_parts").update({ image_url: url }).eq("id", p.id);
      toast.success("Immagine caricata");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const addNew = async () => {
    const key = prompt("Chiave pezzo (es. radar-mk2)");
    if (!key) return;
    const { error } = await supabase.from("ship_parts").insert({ key, name: key });
    if (error) toast.error(error.message); else reload();
  };
  const del = async (id: string) => {
    if (!confirm("Eliminare?")) return;
    await supabase.from("ship_parts").delete().eq("id", id);
    reload();
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground">Pezzi della navicella & premi. Per le medaglie usa la tabella <code>rewards</code> dal pannello premi del gioco.</p>
      <button onClick={addNew} className="panel-strong p-2 text-xs self-start">+ Nuovo pezzo</button>
      <div className="grid grid-cols-2 gap-2">
        {parts.map((p) => (
          <div key={p.id} className="panel-strong p-2 flex flex-col gap-2 text-xs">
            <div className="aspect-square panel flex items-center justify-center overflow-hidden rounded">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" /> : <span className="text-3xl">{p.emoji}</span>}
            </div>
            <label className="panel px-2 py-1 cursor-pointer text-center text-[10px]">
              <Upload className="h-3 w-3 inline mr-1" />Carica
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(p, e.target.files[0])} />
            </label>
            <input className="input" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} placeholder="Nome" />
            <input className="input" value={p.emoji} onChange={(e) => update(p.id, { emoji: e.target.value })} placeholder="Emoji" />
            <textarea className="input" rows={2} value={p.description ?? ""} onChange={(e) => update(p.id, { description: e.target.value })} placeholder="Descrizione" />
            <select className="input" value={p.rarity} onChange={(e) => update(p.id, { rarity: e.target.value })}>
              <option value="comune">Comune</option><option value="rara">Rara</option><option value="epica">Epica</option><option value="leggendaria">Leggendaria</option>
            </select>
            <div className="flex gap-1">
              <button onClick={() => save(p)} disabled={busy === p.id} className="flex-1 panel-strong p-1.5 flex items-center justify-center gap-1"><Save className="h-3 w-3" />Salva</button>
              <button onClick={() => del(p.id)} className="panel p-1.5 text-rose-400"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
