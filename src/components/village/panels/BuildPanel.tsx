import { useState } from "react";
import { motion } from "framer-motion";
import { Hammer, ArrowUpRight, Clock } from "lucide-react";
import { VillagePanelSheet } from "./VillagePanelSheet";
import {
  costForLevel,
  formatRemaining,
  startBuilding,
  startUpgrade,
  type BaseBuilding,
  type BuildingCatalog,
} from "@/lib/base";
import { useBuildingImages } from "@/hooks/useBuildingImages";
import { pickBuildingImage } from "@/lib/village/buildingImages";
import { sfx } from "@/lib/sfx";
import { hapticTap } from "@/lib/haptic";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agent: string;
  coins: number;
  catalog: BuildingCatalog[];
  buildings: BaseBuilding[];
  /** Quando l'utente conferma "Costruisci", parte la modalità placement sulla mappa. */
  onRequestPlacement: (c: BuildingCatalog) => void;
  onRefresh: () => void;
}

export function BuildPanel({
  open, onOpenChange, agent, coins, catalog, buildings, onRequestPlacement, onRefresh,
}: Props) {
  const [tab, setTab] = useState<"catalog" | "active">("catalog");
  const imageMap = useBuildingImages();

  const own = (key: string) => buildings.find((b) => b.type === key);
  const active = buildings.filter((b) => b.status !== "idle");

  return (
    <VillagePanelSheet open={open} onOpenChange={onOpenChange}
      title="Costruzione" icon={<Hammer className="h-4 w-4 text-amber-400" />}>
      <div className="grid grid-cols-2 gap-1 mb-3 panel p-1 text-[11px]">
        {(["catalog", "active"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-1.5 rounded-md transition ${tab === t ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>
            {t === "catalog" ? "Catalogo" : `In cantiere (${active.length})`}
          </button>
        ))}
      </div>

      {tab === "catalog" && (
        <div className="grid grid-cols-1 gap-2">
          {catalog.map((c) => {
            const owned = own(c.key);
            const img = pickBuildingImage(imageMap.get(c.key), owned?.level ?? 1);
            const cost = costForLevel(c, owned ? Math.min(c.max_level, owned.level + 1) : 1);
            const isMax = owned && owned.level >= c.max_level;
            const isBusy = owned && owned.status !== "idle";
            const canAfford = coins >= cost.coins;
            return (
              <motion.div key={c.key} layout
                className="panel p-3 flex items-center gap-3">
                <div className="w-14 h-14 panel-strong flex items-center justify-center overflow-hidden shrink-0">
                  {img ? <img src={img} alt={c.name} className="w-full h-full object-contain" />
                       : <span className="text-2xl">{c.emoji}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{c.description}</p>
                  <div className="text-[10px] mt-1 flex items-center gap-2 flex-wrap">
                    {owned ? (
                      <span className="text-primary">Lv {owned.level}/{c.max_level}</span>
                    ) : (
                      <span className="text-muted-foreground">Non costruito</span>
                    )}
                    {!isMax && (
                      <>
                        <span>{cost.coins}💰</span>
                        <span><Clock className="inline h-3 w-3" /> {cost.minutes}m</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {isBusy ? (
                    <span className="text-[10px] text-amber-400 font-mono">{formatRemaining(owned!.build_end_at)}</span>
                  ) : isMax ? (
                    <span className="text-[10px] text-primary">MAX</span>
                  ) : owned ? (
                    <button
                      disabled={!canAfford}
                      onClick={async () => {
                        hapticTap();
                        try { await startUpgrade(agent, owned, c); sfx.upgrade(); onRefresh(); }
                        catch (e: any) { alert(e.message); }
                      }}
                      className="btn-neon px-3 py-1.5 text-[10px] disabled:opacity-40 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" /> Evolvi
                    </button>
                  ) : (
                    <button
                      disabled={!canAfford}
                      onClick={() => { hapticTap(); onRequestPlacement(c); onOpenChange(false); }}
                      className="btn-neon px-3 py-1.5 text-[10px] disabled:opacity-40">
                      {canAfford ? "Costruisci" : "💰 manca"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {tab === "active" && (
        <div className="space-y-2">
          {active.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nessuna struttura in costruzione.
            </p>
          )}
          {active.map((b) => {
            const c = catalog.find((x) => x.key === b.type);
            const total = b.build_end_at && b.started_at
              ? Math.max(1, new Date(b.build_end_at).getTime() - new Date(b.started_at).getTime())
              : 1;
            const elapsed = b.started_at ? Date.now() - new Date(b.started_at).getTime() : 0;
            const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
            return (
              <div key={b.id} className="panel p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{c?.emoji ?? "🏗️"}</span>
                  <p className="text-xs font-semibold flex-1">{c?.name ?? b.type}</p>
                  <span className="text-[10px] font-mono text-amber-400">
                    {formatRemaining(b.build_end_at)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-night/60 overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => onRefresh()}
        className="panel mt-4 w-full py-2 text-[11px] text-muted-foreground">
        Aggiorna
      </button>
    </VillagePanelSheet>
  );
}

export { startBuilding };
