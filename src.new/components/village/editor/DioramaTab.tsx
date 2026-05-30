import { useDioramaLibrary } from "@/hooks/useActiveDiorama";
import { ImageIcon } from "lucide-react";

interface Props {
  biomeKey: string;
}

/** Preview riassuntiva dei diorami caricati per il bioma. Upload completo nella Fase 2. */
export function DioramaTab({ biomeKey }: Props) {
  const { items, loading } = useDioramaLibrary(biomeKey);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Carica e gestisci l'immagine di sfondo del bioma. Il diorama attivo viene mostrato a tutti gli agenti.
      </p>
      {loading && <p className="text-xs text-muted-foreground">Caricamento…</p>}
      {!loading && items.length === 0 && (
        <div className="panel p-6 text-center text-xs text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nessun diorama caricato per questo bioma.
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {items.map((d) => (
          <div key={d.id} className={`rounded-xl overflow-hidden border ${d.is_active ? "border-primary ring-2 ring-primary/50" : "border-border/50"}`}>
            <img src={d.image_url} alt={d.name ?? "Diorama"} className="w-full aspect-video object-cover" />
            <div className="p-2 text-[10px] flex items-center justify-between">
              <span className="truncate">{d.name ?? "—"}</span>
              {d.is_active && <span className="text-primary">attivo</span>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground italic text-center pt-2">
        Upload, crop e bounds camera arrivano nella Fase 2.
      </p>
    </div>
  );
}
