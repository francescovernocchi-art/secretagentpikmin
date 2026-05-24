import { Sparkles } from "lucide-react";
import { VillagePanelSheet } from "./VillagePanelSheet";
import { BONUS_ICON, BONUS_LABEL, type VillageStatus, type BonusKey } from "@/lib/village/bonuses";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  status: VillageStatus;
}

export function BonusPanel({ open, onOpenChange, status }: Props) {
  // Raggruppa per bonus key
  const grouped = new Map<BonusKey, { total: number; sources: { name: string; level: number; amount: number }[] }>();
  for (const s of status.sources) {
    const g = grouped.get(s.bonus) ?? { total: 0, sources: [] };
    g.total += s.amount;
    g.sources.push({ name: s.buildingName, level: s.level, amount: s.amount });
    grouped.set(s.bonus, g);
  }

  // Mostra anche i totali di stato (incluse fazioni)
  const totals: { key: BonusKey; total: number }[] = [
    { key: "energy_max", total: status.energyMax },
    { key: "defense", total: status.defenseRating },
    { key: "pikmin_per_hour", total: status.pikminPerHour },
    { key: "scan_range", total: status.scanRange },
    { key: "storage", total: status.storageBonus },
  ];

  return (
    <VillagePanelSheet open={open} onOpenChange={onOpenChange}
      title="Bonus aggregati" icon={<Sparkles className="h-4 w-4 text-cyan-400" />}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {totals.map((t) => (
            <div key={t.key} className="panel-strong p-2 flex items-center gap-2">
              <span className="text-xl">{BONUS_ICON[t.key]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground truncate">
                  {BONUS_LABEL[t.key]}
                </p>
                <p className="text-base font-display text-primary">{t.total}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] uppercase tracking-widest text-primary mt-3">Da dove arrivano</p>
        {grouped.size === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4 panel">
            Nessuna struttura genera bonus al momento. Costruisci edifici dal pannello Costruzione.
          </p>
        )}
        {Array.from(grouped.entries()).map(([k, g]) => (
          <div key={k} className="panel p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{BONUS_ICON[k]}</span>
              <p className="text-xs font-semibold">{BONUS_LABEL[k]}</p>
              <span className="ml-auto text-sm text-primary">+{g.total}</span>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-0.5">
              {g.sources.map((s, i) => (
                <li key={i} className="flex justify-between">
                  <span>{s.name} <span className="text-[9px]">Lv {s.level}</span></span>
                  <span>+{s.amount}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </VillagePanelSheet>
  );
}
