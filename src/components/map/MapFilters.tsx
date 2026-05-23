import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X } from "lucide-react";

export type MapFilterKey =
  | "monsters"
  | "base"
  | "village"
  | "playerRadius"
  | "baseRadius"
  | "objects"
  | "shipParts"
  | "resources"
  | "missions"
  | "drops"
  | "allies"
  | "dangerZones";

export type MapFilters = Record<MapFilterKey, boolean>;

export const DEFAULT_FILTERS: MapFilters = {
  monsters: true,
  base: true,
  village: true,
  playerRadius: true,
  baseRadius: true,
  objects: true,
  shipParts: true,
  resources: true,
  missions: true,
  drops: true,
  allies: true,
  dangerZones: true,
};

const STORAGE_KEY = "map.filters.v1";

export function loadFilters(): MapFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function saveFilters(f: MapFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
  } catch {
    // ignore
  }
}

const LABELS: Record<MapFilterKey, { label: string; emoji: string }> = {
  monsters: { label: "Mostri", emoji: "👾" },
  base: { label: "Campo Base", emoji: "🏕️" },
  village: { label: "Villaggio", emoji: "🏘️" },
  playerRadius: { label: "Raggio giocatore", emoji: "🎯" },
  baseRadius: { label: "Raggio Campo Base", emoji: "🛡️" },
  objects: { label: "Oggetti", emoji: "📦" },
  shipParts: { label: "Pezzi di navicella", emoji: "🚀" },
  resources: { label: "Risorse rare", emoji: "💎" },
  missions: { label: "Missioni", emoji: "📜" },
  drops: { label: "Drop", emoji: "🎁" },
  allies: { label: "Alleati", emoji: "🕵️" },
  dangerZones: { label: "Zone pericolose", emoji: "☠️" },
};

interface Props {
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
}

export function MapFilters({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  const toggle = (k: MapFilterKey) => {
    onChange({ ...filters, [k]: !filters[k] });
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute bottom-3 left-3 z-[450] panel-strong p-2.5 text-primary flex items-center gap-1.5 text-[10px] uppercase tracking-widest"
        aria-label="Filtro mappa"
      >
        <Filter className="h-4 w-4" />
        Filtri
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-3 right-3 z-[460] panel-strong p-3 max-h-[55vh] overflow-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">
                // Filtro mappa
              </p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(LABELS) as MapFilterKey[]).map((k) => {
                const on = filters[k];
                const { label, emoji } = LABELS[k];
                return (
                  <button
                    key={k}
                    onClick={() => toggle(k)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left text-xs transition ${
                      on
                        ? "border-primary/60 bg-primary/15 text-foreground"
                        : "border-border bg-background/30 text-muted-foreground opacity-60"
                    }`}
                  >
                    <span className="text-base">{emoji}</span>
                    <span className="flex-1 truncate">{label}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${on ? "bg-primary shadow-[0_0_6px_var(--color-primary)]" : "bg-muted-foreground/40"}`}
                    />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
