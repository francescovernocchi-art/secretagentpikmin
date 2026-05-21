import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  label?: string;
  url: string;
  onUrl: (v: string) => void;
  folder: "enemies" | "pikmin" | "ingredients" | "ship-parts";
  pathHint: string;
}

/**
 * Uploader unificato per le icone di gioco.
 * Carica nel bucket pubblico `game-icons` sotto la cartella della categoria.
 */
export function IconUploader({ label = "Icona", url, onUrl, folder, pathHint }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      const safe = (pathHint || "icon").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
      const path = `${folder}/${safe}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("game-icons").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || `image/${ext}`,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("game-icons").getPublicUrl(path);
      onUrl(data.publicUrl);
    } catch (err) {
      console.error("upload failed", err);
      alert("Upload fallito: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {url && (
        <img
          src={url}
          alt="preview"
          className="h-20 w-20 object-contain rounded-lg border border-border bg-night/40"
        />
      )}
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => onUrl(e.target.value)}
          placeholder="https://… oppure carica un file"
          className="flex-1 min-w-0 rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
        <label
          className={`btn-neon px-3 py-1.5 text-xs cursor-pointer whitespace-nowrap ${
            uploading ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          {uploading ? "Carico…" : "📷 Carica"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
