import { Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { VillagePanelSheet } from "./VillagePanelSheet";
import { usePikminSpecies } from "@/hooks/usePikminSpecies";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  total: number;
  breakdown: Record<string, number>;
}

export function PikminPanel({ open, onOpenChange, total, breakdown }: Props) {
  const { species } = usePikminSpecies();

  return (
    <VillagePanelSheet open={open} onOpenChange={onOpenChange}
      title="Pikmin" icon={<Users className="h-4 w-4 text-rose-400" />}>
      <div className="panel-strong p-3 text-center mb-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Squadra totale</p>
        <p className="text-3xl font-display text-glow">{total}</p>
      </div>

      <p className="text-[10px] uppercase tracking-widest text-primary mb-2">Composizione inventario</p>
      <div className="grid grid-cols-2 gap-2">
        {species.map((s) => {
          const n = breakdown[s.key] ?? 0;
          return (
            <div key={s.key} className="panel p-2 flex items-center gap-2">
              <span className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ background: s.color ?? "#94a3b8" }}>
                {s.icon_url ? <img src={s.icon_url} alt={s.name} className="w-full h-full object-contain" />
                            : <span className="text-base">🌱</span>}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{n} in squadra</p>
              </div>
            </div>
          );
        })}
        {species.length === 0 && (
          <p className="col-span-2 text-xs text-muted-foreground text-center py-4">
            Nessuna specie definita. Aggiungile dalla Libreria Sprite (admin).
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to="/inventario" className="btn-neon py-2 text-xs text-center">Inventario</Link>
        <Link to="/spedizioni" className="panel-strong py-2 text-xs text-center">Spedizioni</Link>
      </div>
    </VillagePanelSheet>
  );
}
