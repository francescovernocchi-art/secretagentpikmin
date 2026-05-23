import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAsset } from "@/lib/admin-upload";
import { invalidateBuildingImagesCache } from "@/lib/village/buildingImages";
import { toast } from "sonner";
import { Upload, Save } from "lucide-react";

interface CatalogRow {
  key: string;
  name: string;
  emoji: string;
  category: string;
  description: string | null;
  image_url: string | null;
  visual_stages: any; // jsonb array di URL per livello (max 5)
  sort_order: number;
  max_level: number;
}

/** Editor per il catalogo strutture: carica immagini base + per livello (1..5). */
export function BuildingsEditor() {
  const [list, setList] = useState<CatalogRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    const { data } = await supabase
      .from("building_catalog")
      .select("key,name,emoji,category,description,image_url,visual_stages,sort_order,max_level")
      .order("sort_order");
    setList((data ?? []) as CatalogRow[]);
    invalidateBuildingImagesCache();
  };
  useEffect(() => { reload(); }, []);

  const patch = (key: string, p: Partial<CatalogRow>) =>
    setList((prev) => prev.map((b) => (b.key === key ? { ...b, ...p } : b)));

  const save = async (b: CatalogRow) => {
    setBusy(b.key);
    const { error } = await supabase.from("building_catalog").update({
      name: b.name,
      emoji: b.emoji,
      description: b.description,
      image_url: b.image_url,
      visual_stages: b.visual_stages ?? [],
      sort_order: b.sort_order,
    }).eq("key", b.key);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success("Salvato"); invalidateBuildingImagesCache(); }
  };

  const uploadBase = async (b: CatalogRow, file: File) => {
    setBusy(b.key);
    try {
      const url = await uploadAsset("building-images", file, b.key);
      patch(b.key, { image_url: url });
      await supabase.from("building_catalog").update({ image_url: url }).eq("key", b.key);
      invalidateBuildingImagesCache();
      toast.success("Immagine base caricata");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const uploadStage = async (b: CatalogRow, level: number, file: File) => {
    setBusy(b.key + level);
    try {
      const url = await uploadAsset("building-images", file, `${b.key}-lv${level}`);
      const stages: string[] = Array.isArray(b.visual_stages) ? [...b.visual_stages] : [];
      while (stages.length < 5) stages.push("");
      stages[level - 1] = url;
      patch(b.key, { visual_stages: stages });
      await supabase.from("building_catalog").update({ visual_stages: stages }).eq("key", b.key);
      invalidateBuildingImagesCache();
      toast.success(`Immagine livello ${level} caricata`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const stageUrl = (b: CatalogRow, level: number): string => {
    const s = Array.isArray(b.visual_stages) ? b.visual_stages : [];
    return (s[level - 1] as string) || "";
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground panel p-2">
        Carica un'immagine <b>base</b> per ogni struttura, oppure immagini specifiche per ciascun livello (1 → 5).
        Le immagini caricate qui appaiono automaticamente nello sfondo del villaggio quando la struttura viene costruita.
      </p>

      {list.map((b) => (
        <div key={b.key} className="panel-strong p-3 flex flex-col gap-3">
          <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 panel flex items-center justify-center overflow-hidden">
                {b.image_url
                  ? <img src={b.image_url} alt={b.name} className="w-full h-full object-contain" />
                  : <span className="text-2xl">{b.emoji}</span>}
              </div>
              <label className="text-[10px] panel px-2 py-1 cursor-pointer">
                <Upload className="h-3 w-3 inline mr-1" />Base
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadBase(b, e.target.files[0])} />
              </label>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
              <label className="col-span-1">Chiave<input className="w-full input" value={b.key} disabled /></label>
              <label className="col-span-1">Nome<input className="w-full input" value={b.name}
                onChange={(e) => patch(b.key, { name: e.target.value })} /></label>
              <label className="col-span-1">Emoji<input className="w-full input" value={b.emoji}
                onChange={(e) => patch(b.key, { emoji: e.target.value })} /></label>
              <label className="col-span-1">Ordine<input type="number" className="w-full input" value={b.sort_order}
                onChange={(e) => patch(b.key, { sort_order: Number(e.target.value) })} /></label>
              <label className="col-span-2">Descrizione<textarea className="w-full input" rows={2} value={b.description ?? ""}
                onChange={(e) => patch(b.key, { description: e.target.value })} /></label>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((lv) => {
              const url = stageUrl(b, lv);
              return (
                <div key={lv} className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-muted-foreground">Lv {lv}</div>
                  <div className="w-full aspect-square panel flex items-center justify-center overflow-hidden">
                    {url
                      ? <img src={url} alt={`lv${lv}`} className="w-full h-full object-contain" />
                      : <span className="text-lg opacity-50">{b.emoji}</span>}
                  </div>
                  <label className="text-[10px] panel px-1 py-0.5 cursor-pointer w-full text-center">
                    <Upload className="h-3 w-3 inline" />
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadStage(b, lv, e.target.files[0])} />
                  </label>
                </div>
              );
            })}
          </div>

          <button onClick={() => save(b)} disabled={busy === b.key}
            className="panel-strong p-2 flex items-center justify-center gap-1 text-xs">
            <Save className="h-3 w-3" /> {busy === b.key ? "Salvo…" : "Salva"}
          </button>
        </div>
      ))}

      {list.length === 0 && (
        <p className="text-xs text-muted-foreground text-center p-4">
          Nessuna struttura nel catalogo. Aggiungile dalla pagina Villaggio o tramite migrazione.
        </p>
      )}
    </div>
  );
}
