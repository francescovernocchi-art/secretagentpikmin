import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon, X, RefreshCw } from "lucide-react";

interface Item {
  name: string;
  url: string;
  updatedAt: string;
}

interface Props {
  onPick: (url: string) => void;
  buttonLabel?: string;
  folder?: string;
}

/**
 * Bottone "Galleria" che apre un modale con le icone già caricate
 * nel bucket `captures/<folder>` (default: `recipe-icons`).
 * Selezionando un'icona, viene restituito il suo URL pubblico.
 */
export function IconGalleryPicker({
  onPick,
  buttonLabel = "Galleria",
  folder = "recipe-icons",
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="panel px-3 py-1.5 text-[11px] flex items-center gap-1"
      >
        <ImageIcon className="h-3 w-3" />
        {buttonLabel}
      </button>
      <AnimatePresence>
        {open && (
          <GalleryModal
            folder={folder}
            onClose={() => setOpen(false)}
            onPick={(url) => {
              onPick(url);
              setOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function GalleryModal({
  folder,
  onClose,
  onPick,
}: {
  folder: string;
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.storage
      .from("captures")
      .list(folder, {
        limit: 200,
        sortBy: { column: "updated_at", order: "desc" },
      });
    if (err) {
      setError(err.message);
      setItems([]);
      setLoading(false);
      return;
    }
    const files = (data ?? []).filter(
      (f) => f.name && !f.name.startsWith(".") && /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f.name),
    );
    const mapped: Item[] = files.map((f) => {
      const path = `${folder}/${f.name}`;
      const { data: pub } = supabase.storage.from("captures").getPublicUrl(path);
      return {
        name: f.name,
        url: pub.publicUrl,
        updatedAt: f.updated_at ?? f.created_at ?? "",
      };
    });
    setItems(mapped);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-night/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="panel-strong w-full max-w-md p-4 space-y-3 max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">
            // Galleria icone
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={load}
              className="panel h-7 w-7 flex items-center justify-center text-muted-foreground"
              aria-label="Aggiorna"
              title="Aggiorna"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="panel h-7 w-7 flex items-center justify-center text-muted-foreground"
              aria-label="Chiudi"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Caricamento…</p>
          ) : error ? (
            <p className="text-xs text-destructive text-center py-8">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nessuna icona caricata. Usa “Carica icona” per aggiungerne.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {items.map((it) => (
                <button
                  key={it.name}
                  type="button"
                  onClick={() => onPick(it.url)}
                  className="aspect-square rounded-lg border border-primary/20 bg-night/60 overflow-hidden hover:border-primary/60 hover:ring-1 hover:ring-primary/40 transition"
                  title={it.name}
                >
                  <img
                    src={it.url}
                    alt={it.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Tocca un’icona per usarla.
        </p>
      </motion.div>
    </motion.div>
  );
}
