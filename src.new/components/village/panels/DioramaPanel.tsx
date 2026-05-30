import { useState, useRef } from "react";
import { Image as ImageIcon, Upload, Loader2, Check, Trash2 } from "lucide-react";
import { VillagePanelSheet } from "./VillagePanelSheet";
import { useDioramaLibrary, type DioramaRow } from "@/hooks/useActiveDiorama";
import { supabase } from "@/integrations/supabase/client";
import { resolveBiome } from "@/lib/village/biomes";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  biome: string;
  onChanged?: () => void;
}

/** Pannello per gestire i diorami HD del villaggio: upload, anteprima, attivazione. */
export function DioramaPanel({ open, onOpenChange, biome, onChanged }: Props) {
  const { items, loading, reload } = useDioramaLibrary(biome);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const b = resolveBiome(biome);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un'immagine (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Immagine troppo grande (max 15 MB)");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { toast.error("Devi essere autenticato"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${uid}/${biome}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("village-dioramas")
        .upload(path, file, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("village-dioramas").getPublicUrl(path);

      // dimensioni reali
      const dims = await new Promise<{ w: number; h: number }>((res) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => res({ w: 2048, h: 2048 });
        img.src = pub.publicUrl;
      });

      // disattiva gli altri dell'utente per questo bioma
      await supabase
        .from("village_dioramas")
        .update({ is_active: false })
        .eq("owner_id", uid)
        .eq("biome", biome);

      const { error: insErr } = await supabase.from("village_dioramas").insert({
        owner_id: uid,
        biome,
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Diorama",
        image_url: pub.publicUrl,
        width: dims.w,
        height: dims.h,
        is_active: true,
        is_system: false,
      });
      if (insErr) throw insErr;

      toast.success("Diorama caricato e attivato");
      await reload();
      onChanged?.();
    } catch (e: any) {
      toast.error("Upload fallito: " + (e?.message ?? "errore"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const activate = async (d: DioramaRow) => {
    setBusyId(d.id);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (uid && !d.is_system) {
      await supabase
        .from("village_dioramas")
        .update({ is_active: false })
        .eq("owner_id", uid)
        .eq("biome", biome);
    } else if (uid) {
      // attivare un sistema = disattiva i miei
      await supabase
        .from("village_dioramas")
        .update({ is_active: false })
        .eq("owner_id", uid)
        .eq("biome", biome);
    }
    if (!d.is_system) {
      await supabase.from("village_dioramas").update({ is_active: true }).eq("id", d.id);
    }
    setBusyId(null);
    toast.success("Diorama attivo: " + d.name);
    await reload();
    onChanged?.();
  };

  const remove = async (d: DioramaRow) => {
    if (d.is_system) { toast.error("Non puoi eliminare un diorama di sistema"); return; }
    if (!confirm(`Eliminare "${d.name}"?`)) return;
    setBusyId(d.id);
    const { error } = await supabase.from("village_dioramas").delete().eq("id", d.id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Diorama eliminato");
    await reload();
    onChanged?.();
  };

  return (
    <VillagePanelSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Diorami · ${b.emoji} ${b.label}`}
      icon={<ImageIcon className="h-4 w-4 text-fuchsia-400" />}
    >
      <div className="space-y-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Carica una scena HD (PNG/JPG, max 15&nbsp;MB) per il bioma corrente. Quella attiva
          sostituisce il diorama di sistema sulla mappa.
        </p>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="btn-neon w-full py-2.5 text-xs inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Caricamento…</>
            ) : (
              <><Upload className="h-4 w-4" /> Carica nuovo diorama</>
            )}
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary">Libreria</p>
          {loading && <p className="text-[11px] text-muted-foreground">Caricamento…</p>}
          {!loading && items.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic">Nessun diorama per questo bioma.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {items.map((d) => (
              <div
                key={d.id}
                className={`relative rounded-lg overflow-hidden border ${
                  d.is_active ? "border-primary ring-2 ring-primary/60" : "border-border"
                } bg-[oklch(0.18_0.04_250/_0.9)]`}
              >
                <img
                  src={d.image_url}
                  alt={d.name}
                  loading="lazy"
                  className="w-full aspect-square object-cover"
                />
                <div className="p-1.5 text-[10px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate font-medium">{d.name}</span>
                    {d.is_system && (
                      <span className="text-[8px] px-1 py-px rounded bg-fuchsia-500/30 text-fuchsia-100">
                        SYS
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground text-[9px]">
                    {d.width}×{d.height}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {!d.is_active && (
                      <button
                        disabled={busyId === d.id}
                        onClick={() => activate(d)}
                        className="flex-1 px-1.5 py-1 rounded bg-primary/20 hover:bg-primary/30 text-[10px] inline-flex items-center justify-center gap-1"
                      >
                        {busyId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Attiva
                      </button>
                    )}
                    {d.is_active && (
                      <span className="flex-1 px-1.5 py-1 rounded bg-primary/30 text-[10px] inline-flex items-center justify-center gap-1">
                        <Check className="h-3 w-3" /> Attivo
                      </span>
                    )}
                    {!d.is_system && (
                      <button
                        disabled={busyId === d.id}
                        onClick={() => remove(d)}
                        className="px-1.5 py-1 rounded bg-destructive/20 hover:bg-destructive/30 text-[10px]"
                        title="Elimina"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </VillagePanelSheet>
  );
}
