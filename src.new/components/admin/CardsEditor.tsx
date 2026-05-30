import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAsset } from "@/lib/admin-upload";
import { toast } from "sonner";
import { Upload, Save, Trash2 } from "lucide-react";

interface Card {
  id: string;
  key: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rarity: string;
  category: string;
  sort_order: number;
}

export function CardsEditor() {
  const [list, setList] = useState<Card[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    const { data } = await supabase.from("collectible_cards").select("*").order("sort_order");
    setList((data ?? []) as Card[]);
  };
  useEffect(() => { reload(); }, []);

  const update = (id: string, patch: Partial<Card>) => setList((p) => p.map((c) => c.id === id ? { ...c, ...patch } : c));

  const save = async (c: Card) => {
    setBusy(c.id);
    const { error } = await supabase.from("collectible_cards").update({
      name: c.name, description: c.description, image_url: c.image_url,
      rarity: c.rarity, category: c.category, sort_order: c.sort_order,
    }).eq("id", c.id);
    setBusy(null);
    if (error) toast.error(error.message); else toast.success("Carta salvata");
  };

  const addNew = async () => {
    const key = prompt("Chiave carta (univoca, es. card-001)");
    if (!key) return;
    const { error } = await supabase.from("collectible_cards").insert({ key, name: key });
    if (error) toast.error(error.message); else reload();
  };

  const del = async (id: string) => {
    if (!confirm("Eliminare la carta?")) return;
    await supabase.from("collectible_cards").delete().eq("id", id);
    reload();
  };

  const onUpload = async (c: Card, file: File) => {
    setBusy(c.id);
    try {
      const url = await uploadAsset("card-images", file, c.key);
      update(c.id, { image_url: url });
      await supabase.from("collectible_cards").update({ image_url: url }).eq("id", c.id);
      toast.success("Immagine caricata");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-3">
      <button onClick={addNew} className="panel-strong p-2 text-xs self-start">+ Nuova carta</button>
      <div className="grid grid-cols-2 gap-2">
        {list.map((c) => (
          <div key={c.id} className="panel-strong p-2 flex flex-col gap-2">
            <div className="aspect-[3/4] panel flex items-center justify-center overflow-hidden rounded">
              {c.image_url ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" /> : <span className="text-3xl">🃏</span>}
            </div>
            <label className="text-[10px] panel px-2 py-1 cursor-pointer text-center">
              <Upload className="h-3 w-3 inline mr-1" />Carica immagine
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(c, e.target.files[0])} />
            </label>
            <input className="input text-xs" value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} placeholder="Nome" />
            <textarea className="input text-xs" rows={2} value={c.description ?? ""} onChange={(e) => update(c.id, { description: e.target.value })} placeholder="Descrizione" />
            <div className="grid grid-cols-2 gap-1">
              <select className="input text-xs" value={c.rarity} onChange={(e) => update(c.id, { rarity: e.target.value })}>
                <option value="comune">Comune</option><option value="rara">Rara</option>
                <option value="epica">Epica</option><option value="leggendaria">Leggendaria</option>
              </select>
              <input className="input text-xs" value={c.category} onChange={(e) => update(c.id, { category: e.target.value })} placeholder="Categoria" />
            </div>
            <div className="flex gap-1">
              <button onClick={() => save(c)} disabled={busy === c.id} className="flex-1 panel-strong p-1.5 text-xs flex items-center justify-center gap-1">
                <Save className="h-3 w-3" /> Salva
              </button>
              <button onClick={() => del(c.id)} className="panel p-1.5 text-xs text-rose-400"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
