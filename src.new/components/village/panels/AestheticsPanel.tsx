import { Palette, Image as ImageIcon, Mountain, Sparkles } from "lucide-react";
import { VillagePanelSheet } from "./VillagePanelSheet";
import { BiomeSelector } from "../BiomeSelector";
import { VillageCustomizer } from "../VillageCustomizer";
import { DioramaPanel } from "./DioramaPanel";
import { BiomeAdminPanel } from "./BiomeAdminPanel";
import { EventsAdminPanel } from "./EventsAdminPanel";
import { useState, useEffect } from "react";
import { usePikminSpecies } from "@/hooks/usePikminSpecies";
import {
  loadPikminPrefs, savePikminPrefs, MAX_PIKMIN, type PikminLayerPrefs,
} from "@/components/pikmin/VillagePikminLayer";
import { getCosmetics, type VillageCosmetics } from "@/lib/village/cosmetics";
import { resolveBiome } from "@/lib/village/biomes";
import { useCustomBiomes } from "@/hooks/useCustomBiomes";
import { getSession } from "@/lib/session";
import type { BaseRow } from "@/lib/base";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agent: string;
  base: BaseRow;
  prefs: PikminLayerPrefs;
  onPrefsChange: (p: PikminLayerPrefs) => void;
  onBaseChange: (b: BaseRow) => void;
  onRefresh: () => void;
}

export function AestheticsPanel({
  open, onOpenChange, agent, base, prefs, onPrefsChange, onBaseChange, onRefresh,
}: Props) {
  const { species } = usePikminSpecies();
  const { reload: reloadBiomes } = useCustomBiomes();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [dioramaOpen, setDioramaOpen] = useState(false);
  const [biomeAdminOpen, setBiomeAdminOpen] = useState(false);
  const [eventsAdminOpen, setEventsAdminOpen] = useState(false);
  const [isPapa, setIsPapa] = useState(false);
  const cosmetics: VillageCosmetics = getCosmetics(base.layout);
  const biomeKey = resolveBiome(base.theme).key;

  useEffect(() => { setIsPapa(getSession()?.role === "papa"); }, []);

  const update = (p: PikminLayerPrefs) => { onPrefsChange(p); savePikminPrefs(p); };

  return (
    <>
      <VillagePanelSheet open={open} onOpenChange={onOpenChange}
        title="Estetica" icon={<Palette className="h-4 w-4 text-fuchsia-400" />}>
        <div className="space-y-4">
          <section>
            <p className="text-[10px] uppercase tracking-widest text-primary mb-2">Bioma</p>
            <BiomeSelector agent={agent} currentTheme={base.theme}
              onChanged={(key) => onBaseChange({ ...base, theme: key })} />
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-widest text-primary mb-2">Pikmin visibili</p>
            <div className="panel p-3 space-y-2 text-[11px]">
              <label className="flex items-center justify-between">
                <span>Mostra Pikmin</span>
                <input type="checkbox" checked={prefs.show}
                  onChange={(e) => update({ ...prefs, show: e.target.checked })}
                  className="accent-primary" />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="shrink-0">Max in scena</span>
                <input type="range" min={3} max={MAX_PIKMIN} value={prefs.maxCap}
                  onChange={(e) => update({ ...prefs, maxCap: Number(e.target.value) })}
                  className="flex-1 accent-primary" />
                <span className="w-6 text-right">{prefs.maxCap}</span>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="shrink-0">Velocità</span>
                <input type="range" min={0.5} max={2} step={0.1} value={prefs.speed}
                  onChange={(e) => update({ ...prefs, speed: Number(e.target.value) })}
                  className="flex-1 accent-primary" />
                <span className="w-8 text-right">{prefs.speed.toFixed(1)}x</span>
              </label>
              <label className="flex items-center justify-between">
                <span>Effetto notte</span>
                <input type="checkbox" checked={prefs.night}
                  onChange={(e) => update({ ...prefs, night: e.target.checked })}
                  className="accent-primary" />
              </label>
            </div>
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-widest text-primary mb-2">Filtri specie</p>
            <div className="flex flex-wrap gap-1.5">
              {species.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">Aggiungi specie dalla Libreria Sprite (admin).</p>
              )}
              {species.map((s) => {
                const on = prefs.filters[s.key] !== false;
                return (
                  <button key={s.key}
                    onClick={() => update({ ...prefs, filters: { ...prefs.filters, [s.key]: !on } })}
                    className={`px-2.5 py-1 rounded-full border text-[10px] transition ${
                      on ? "bg-primary/20 border-primary/50" : "border-muted-foreground/30 text-muted-foreground opacity-60"
                    }`}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                      style={{ background: s.color ?? "#94a3b8" }} />
                    {s.name}
                  </button>
                );
              })}
            </div>
          </section>

          <button onClick={() => setDioramaOpen(true)}
            className="btn-neon w-full py-2 text-xs inline-flex items-center justify-center gap-2">
            <ImageIcon className="h-4 w-4" /> Gestione Diorama
          </button>

          {isPapa && (
            <button onClick={() => setBiomeAdminOpen(true)}
              className="btn-neon w-full py-2 text-xs inline-flex items-center justify-center gap-2">
              <Mountain className="h-4 w-4" /> Biomi Personalizzati (admin)
            </button>
          )}

          {isPapa && (
            <button onClick={() => setEventsAdminOpen(true)}
              className="btn-neon w-full py-2 text-xs inline-flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" /> Eventi del Villaggio (admin)
            </button>
          )}

          <button onClick={() => setCustomizerOpen(true)}
            className="btn-neon w-full py-2 text-xs">
            Apri Customizer Villaggio
          </button>
        </div>
      </VillagePanelSheet>

      <DioramaPanel
        open={dioramaOpen}
        onOpenChange={setDioramaOpen}
        biome={biomeKey}
        onChanged={onRefresh}
      />

      {isPapa && (
        <BiomeAdminPanel
          open={biomeAdminOpen}
          onOpenChange={setBiomeAdminOpen}
          onChanged={() => { reloadBiomes(); onRefresh(); }}
        />
      )}

      {isPapa && (
        <EventsAdminPanel
          open={eventsAdminOpen}
          onOpenChange={setEventsAdminOpen}
          onChanged={onRefresh}
        />
      )}

      {customizerOpen && (
        <VillageCustomizer
          agent={agent}
          initial={cosmetics}
          onClose={() => setCustomizerOpen(false)}
          onSaved={() => { setCustomizerOpen(false); onRefresh(); }}
        />
      )}
    </>
  );
}
