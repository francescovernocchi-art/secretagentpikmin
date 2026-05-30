import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Building2, ArrowUpRight, Clock, Sparkles, Zap, Trash2,
} from "lucide-react";
import { VillagePanelSheet } from "./VillagePanelSheet";
import {
  costForLevel,
  formatRemaining,
  startUpgrade,
  type BaseBuilding,
  type BuildingCatalog,
} from "@/lib/base";
import { useBuildingImages } from "@/hooks/useBuildingImages";
import { pickBuildingImage } from "@/lib/village/buildingImages";
import { sfx } from "@/lib/sfx";
import { hapticTap } from "@/lib/haptic";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agent: string;
  coins: number;
  building: BaseBuilding | null;
  catalog: BuildingCatalog[];
  onRefresh: () => void;
}

export function BuildingPanel({ open, onOpenChange, agent, coins, building, catalog, onRefresh }: Props) {
  const imageMap = useBuildingImages();
  const c = useMemo(
    () => (building ? catalog.find((x) => x.key === building.type) ?? null : null),
    [building, catalog],
  );

  const set = building ? imageMap.get(building.type) : undefined;
  const currentImg = building ? pickBuildingImage(set, building.level) : null;
  const nextImg = building && c
    ? pickBuildingImage(set, Math.min(c.max_level, building.level + 1))
    : null;

  const isBusy = !!building && building.status !== "idle";
  const isMax = !!building && !!c && building.level >= c.max_level;
  const nextCost = building && c && !isMax ? costForLevel(c, building.level + 1) : null;
  const canAfford = nextCost ? coins >= nextCost.coins : false;

  // bonus stack
  const bonuses: { key: string; current: number; next: number; delta: number }[] = useMemo(() => {
    if (!building || !c) return [];
    const bpl = (c.bonus_per_level ?? {}) as Record<string, number>;
    const lvl = Math.max(1, building.level);
    const out: { key: string; current: number; next: number; delta: number }[] = [];
    for (const [k, per] of Object.entries(bpl)) {
      const cur = per * lvl;
      const nxt = per * Math.min(c.max_level, lvl + 1);
      out.push({ key: k, current: cur, next: nxt, delta: nxt - cur });
    }
    return out;
  }, [building, c]);

  const total = building?.build_end_at && building.started_at
    ? Math.max(1, new Date(building.build_end_at).getTime() - new Date(building.started_at).getTime())
    : 1;
  const elapsed = building?.started_at ? Date.now() - new Date(building.started_at).getTime() : 0;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));

  const onUpgrade = async () => {
    if (!building || !c) return;
    hapticTap();
    try {
      await startUpgrade(agent, building, c);
      sfx.upgrade();
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const onDemolish = async () => {
    if (!building) return;
    if (!confirm("Demolire questa struttura? L'azione è irreversibile.")) return;
    await supabase.from("base_buildings").delete().eq("id", building.id);
    onRefresh();
    onOpenChange(false);
  };

  return (
    <VillagePanelSheet
      open={open}
      onOpenChange={onOpenChange}
      title={c?.name ?? building?.type ?? "Edificio"}
      icon={<Building2 className="h-4 w-4 text-primary" />}
    >
      {!building || !c ? (
        <p className="text-xs text-muted-foreground text-center py-6">Seleziona un edificio sul diorama.</p>
      ) : (
        <div className="space-y-3">
          {/* HERO */}
          <motion.div
            layout
            className="relative rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-b from-[oklch(0.18_0.04_250)] to-[oklch(0.10_0.03_250)] p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-xl bg-[oklch(0.12_0.03_250)] border border-primary/30 grid place-items-center overflow-hidden shrink-0">
                {currentImg
                  ? <img src={currentImg} alt={c.name} className="w-full h-full object-contain" />
                  : <span className="text-4xl">{c.emoji}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-primary/80">{c.category}</p>
                <p className="text-sm font-semibold truncate">{c.name}</p>
                <p className="text-[11px] text-amber-300 font-mono mt-0.5">
                  Lv {Math.max(1, building.level)} / {c.max_level}
                </p>
              </div>
            </div>

            {/* Level pips */}
            <div className="flex gap-1 mt-3">
              {Array.from({ length: c.max_level }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < building.level
                      ? "bg-gradient-to-r from-amber-400 to-amber-300"
                      : "bg-night/60 border border-primary/20"
                  }`}
                />
              ))}
            </div>

            {/* In costruzione */}
            {isBusy && (
              <div className="mt-3 panel p-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-amber-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {building.status === "upgrading" ? `Upgrade a Lv ${building.level + 1}` : "Costruzione in corso"}
                  </span>
                  <span className="font-mono text-amber-400">{formatRemaining(building.build_end_at)}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-night/70 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </motion.div>

          {/* DESCRIZIONE */}
          {c.description && (
            <p className="text-[11px] text-muted-foreground leading-snug px-1">
              {c.description}
            </p>
          )}

          {/* BONUS */}
          {bonuses.length > 0 && (
            <div className="panel p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Bonus attivi
              </p>
              {bonuses.map((b) => (
                <div key={b.key} className="flex items-center justify-between text-[11px]">
                  <span className="capitalize text-muted-foreground">{b.key.replace(/_/g, " ")}</span>
                  <span className="font-mono">
                    <span className="text-foreground">+{Math.round(b.current * 10) / 10}</span>
                    {!isMax && b.delta > 0 && (
                      <span className="text-emerald-400 ml-1">→ +{Math.round(b.next * 10) / 10}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* UPGRADE */}
          {!isMax && !isBusy && nextCost && (
            <div className="panel-strong p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Evolvi a Lv {building.level + 1}
                </p>
                {nextImg && nextImg !== currentImg && (
                  <div className="w-10 h-10 rounded-md bg-[oklch(0.12_0.03_250)] border border-primary/30 overflow-hidden">
                    <img src={nextImg} alt="next" className="w-full h-full object-contain opacity-90" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">💰 <b>{nextCost.coins}</b></span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {nextCost.minutes}m</span>
                {nextCost.ingredients?.length > 0 && (
                  <span className="text-muted-foreground">+ {nextCost.ingredients.join(", ")}</span>
                )}
              </div>
              <button
                disabled={!canAfford}
                onClick={onUpgrade}
                className="btn-neon w-full py-2 text-xs disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Zap className="h-3 w-3" />
                {canAfford ? "Avvia evoluzione" : "Monete insufficienti"}
              </button>
            </div>
          )}

          {isMax && (
            <div className="panel p-3 text-center">
              <p className="text-[11px] text-primary font-semibold">⭐ Livello massimo raggiunto</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Questa struttura è al suo picco evolutivo.</p>
            </div>
          )}

          {/* STATS */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="panel p-2">
              <p className="text-muted-foreground">Posizione</p>
              <p className="font-mono">{building.position_x}% · {building.position_y}%</p>
            </div>
            <div className="panel p-2">
              <p className="text-muted-foreground">Slot</p>
              <p className="font-mono truncate">{building.slot_key ?? "—"}</p>
            </div>
          </div>

          <button
            onClick={onDemolish}
            className="w-full py-2 text-[10px] text-rose-400/80 hover:text-rose-400 flex items-center justify-center gap-1"
          >
            <Trash2 className="h-3 w-3" /> Demolisci
          </button>
        </div>
      )}
    </VillagePanelSheet>
  );
}
