import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAsset } from "@/lib/admin-upload";
import { toast } from "sonner";
import { Upload, Save, Trash2, Play, Pause } from "lucide-react";

interface Asset {
  id: string;
  key: string;
  name: string;
  url: string;
  kind: string;
  page: string | null;
  loop: boolean;
  volume: number;
  enabled: boolean;
}

const PAGES = ["global", "villaggio", "mappa", "missioni", "spedizioni", "inventario", "premi", "lab", "navicella"];

export function AudioEditor() {
  const [list, setList] = useState<Asset[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const reload = async () => {
    const { data } = await supabase.from("audio_assets").select("*").order("kind").order("page");
    setList((data ?? []) as Asset[]);
  };
  useEffect(() => { reload(); }, []);

  const update = (id: string, patch: Partial<Asset>) => setList((p) => p.map((a) => a.id === id ? { ...a, ...patch } : a));

  const save = async (a: Asset) => {
    setBusy(a.id);
    const { error } = await supabase.from("audio_assets").update({
      name: a.name, kind: a.kind, page: a.page, loop: a.loop, volume: a.volume, enabled: a.enabled,
    }).eq("id", a.id);
    setBusy(null);
    if (error) toast.error(error.message); else toast.success("Audio salvato");
  };

  const del = async (id: string) => {
    if (!confirm("Eliminare l'audio?")) return;
    await supabase.from("audio_assets").delete().eq("id", id);
    reload();
  };

  const onNew = async (file: File) => {
    const key = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    try {
      const url = await uploadAsset("audio-assets", file, key);
      const { error } = await supabase.from("audio_assets").insert({
        key: `${key}-${Date.now()}`, name: file.name, url, kind: "music", page: "global", loop: true, volume: 0.6,
      });
      if (error) throw error;
      toast.success("Audio caricato");
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="panel-strong p-3 text-xs cursor-pointer text-center">
        <Upload className="h-4 w-4 inline mr-1" /> Carica nuovo file audio (mp3, wav, ogg)
        <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && onNew(e.target.files[0])} />
      </label>
      {list.map((a) => (
        <div key={a.id} className="panel-strong p-3 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (playing === a.id) { setPlaying(null); return; }
                setPlaying(a.id);
                const audio = new Audio(a.url);
                audio.volume = a.volume;
                audio.play();
                audio.onended = () => setPlaying(null);
              }}
              className="panel p-1.5"
            >
              {playing === a.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <input className="input flex-1" value={a.name} onChange={(e) => update(a.id, { name: e.target.value })} />
            <button onClick={() => del(a.id)} className="panel p-1.5 text-rose-400"><Trash2 className="h-3 w-3" /></button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <select className="input" value={a.kind} onChange={(e) => update(a.id, { kind: e.target.value })}>
              <option value="music">Musica</option><option value="ambient">Ambient</option><option value="sfx">SFX</option>
            </select>
            <select className="input" value={a.page ?? "global"} onChange={(e) => update(a.id, { page: e.target.value })}>
              {PAGES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <label className="flex items-center gap-1"><input type="checkbox" checked={a.loop} onChange={(e) => update(a.id, { loop: e.target.checked })} /> Loop</label>
            <label className="col-span-2">Volume {Math.round(a.volume * 100)}%
              <input type="range" min={0} max={1} step={0.05} value={a.volume} onChange={(e) => update(a.id, { volume: Number(e.target.value) })} className="w-full" />
            </label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={a.enabled} onChange={(e) => update(a.id, { enabled: e.target.checked })} /> Attivo</label>
          </div>
          <button onClick={() => save(a)} disabled={busy === a.id} className="panel-strong p-1.5 flex items-center justify-center gap-1">
            <Save className="h-3 w-3" /> {busy === a.id ? "Salvo…" : "Salva"}
          </button>
        </div>
      ))}
    </div>
  );
}
