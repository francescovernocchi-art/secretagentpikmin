import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAsset } from "@/lib/admin-upload";
import { toast } from "sonner";
import { Upload, Trash2, Search } from "lucide-react";

interface Asset {
  id: string;
  category: string;
  name: string;
  url: string;
  tags: string[];
  created_at: string;
}

const CATEGORIES = [
  { key: "decorazione", label: "Decorazioni", emoji: "🌿" },
  { key: "oggetto", label: "Oggetti", emoji: "📦" },
  { key: "effetto", label: "Effetti", emoji: "✨" },
  { key: "ambiente", label: "Ambiente", emoji: "🏞️" },
  { key: "avatar", label: "Avatar", emoji: "🧑" },
  { key: "icona", label: "Icone", emoji: "🔣" },
];

/** Libreria sprite generica: upload immagini con categoria e tag, ricerca, anteprima. */
export function AssetLibraryEditor() {
  const [list, setList] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("decorazione");

  const reload = async () => {
    const { data } = await supabase.from("sprite_assets").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Asset[]);
  };
  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((a) => {
      if (filter !== "all" && a.category !== filter) return false;
      if (!s) return true;
      return a.name.toLowerCase().includes(s) || a.tags.some((t) => t.toLowerCase().includes(s));
    });
  }, [list, filter, search]);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadAsset("game-icons", file, `${uploadCategory}-${file.name}`);
        const name = file.name.replace(/\.[^.]+$/, "");
        const { error } = await supabase.from("sprite_assets").insert({
          category: uploadCategory, name, url, tags: [],
        });
        if (error) throw error;
      }
      toast.success(`${files.length} sprite caricati`);
      await reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminare questo sprite?")) return;
    const { error } = await supabase.from("sprite_assets").delete().eq("id", id);
    if (error) toast.error(error.message); else reload();
  };

  const updateTags = async (id: string, raw: string) => {
    const tags = raw.split(",").map((t) => t.trim()).filter(Boolean);
    setList((p) => p.map((a) => (a.id === id ? { ...a, tags } : a)));
    await supabase.from("sprite_assets").update({ tags }).eq("id", id);
  };

  const updateCategory = async (id: string, category: string) => {
    setList((p) => p.map((a) => (a.id === id ? { ...a, category } : a)));
    await supabase.from("sprite_assets").update({ category }).eq("id", id);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground panel p-2">
        Libreria generica di sprite: carica decorazioni, oggetti, effetti, icone, avatar.
        Ogni asset è riutilizzabile in tutto il gioco tramite URL pubblico.
      </p>

      {/* Upload */}
      <div className="panel-strong p-3 flex flex-wrap items-center gap-2">
        <label className="text-xs">
          Categoria upload:
          <select className="input ml-1" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
          </select>
        </label>
        <label className="panel-strong px-3 py-2 cursor-pointer text-xs flex items-center gap-1">
          <Upload className="h-3 w-3" /> {busy ? "Caricamento…" : "Carica immagini"}
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
        </label>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-full text-xs ${filter === "all" ? "bg-primary text-primary-foreground" : "panel"}`}>
          Tutti ({list.length})
        </button>
        {CATEGORIES.map((c) => {
          const n = list.filter((a) => a.category === c.key).length;
          return (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className={`px-3 py-1 rounded-full text-xs ${filter === c.key ? "bg-primary text-primary-foreground" : "panel"}`}>
              {c.emoji} {c.label} ({n})
            </button>
          );
        })}
        <div className="flex items-center gap-1 panel px-2 ml-auto">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            className="bg-transparent text-xs outline-none w-32"
            placeholder="cerca…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Griglia */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {filtered.map((a) => (
          <div key={a.id} className="panel p-2 flex flex-col gap-1">
            <div className="aspect-square bg-black/30 flex items-center justify-center overflow-hidden rounded">
              <img src={a.url} alt={a.name} className="w-full h-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = ""; }} />
            </div>
            <p className="text-[10px] truncate" title={a.name}>{a.name}</p>
            <select className="input text-[10px] py-0.5" value={a.category}
              onChange={(e) => updateCategory(a.id, e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <input className="input text-[10px] py-0.5" placeholder="tag, csv"
              defaultValue={a.tags.join(",")}
              onBlur={(e) => updateTags(a.id, e.target.value)} />
            <button
              onClick={() => { navigator.clipboard.writeText(a.url); toast.success("URL copiato"); }}
              className="text-[9px] panel-strong py-0.5 hover:bg-primary/20">
              Copia URL
            </button>
            <button onClick={() => remove(a.id)} className="text-[9px] text-destructive flex items-center justify-center gap-1">
              <Trash2 className="h-2.5 w-2.5" /> Elimina
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-xs text-center text-muted-foreground p-4">
            Nessuno sprite. Caricane uno con il bottone in alto.
          </p>
        )}
      </div>
    </div>
  );
}
