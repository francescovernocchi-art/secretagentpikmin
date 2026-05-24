import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CelebrationOverlay } from "@/components/CelebrationOverlay";
import { getSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { hapticTap } from "@/lib/haptic";
import { getCoins } from "@/lib/coins";
import { sfx } from "@/lib/sfx";
import { getDayPhase, type DayPhase } from "@/lib/daycycle";
import {
  type BaseRow, type BaseBuilding, type BuildingCatalog, THEMES,
  fetchCatalog, getBase, listBuildings, createBase, startBuilding, completeBuilding,
  listGifts, claimGift, type BaseGift,
} from "@/lib/base";
import { Sparkles, AlertTriangle, ShieldAlert, Gift } from "lucide-react";
import { FactionSelector } from "@/components/village/FactionSelector";
import { VillageGameCanvas } from "@/components/village/VillageGameCanvas";
import { computeVillageStatus } from "@/lib/village/bonuses";
import type { FactionKey } from "@/lib/village/factions";
import { listWalls, wallDefenseBonus, type WallSegment } from "@/lib/village/walls";
import { listOpenEvents, scanThreats, type VillageEvent } from "@/lib/village/threats";
import { maybeTriggerNightEvent } from "@/lib/village/night";
import { getPikminCount } from "@/lib/pikmin";
import { computeNearbyThreats, type NearbyThreat } from "@/components/village/ThreatAlertPanel";
import { VillageBottomMenu, type VillageMenuKey } from "@/components/village/VillageBottomMenu";
import { BuildPanel } from "@/components/village/panels/BuildPanel";
import { DefensePanel } from "@/components/village/panels/DefensePanel";
import { BonusPanel } from "@/components/village/panels/BonusPanel";
import { AestheticsPanel } from "@/components/village/panels/AestheticsPanel";
import { PikminPanel } from "@/components/village/panels/PikminPanel";
import { loadPikminPrefs, type PikminLayerPrefs } from "@/components/pikmin/VillagePikminLayer";

export const Route = createFileRoute("/villaggio")({
  component: VillaggioPage,
  head: () => ({
    meta: [
      { title: "Villaggio Pikmin · Colonia personale" },
      { name: "description", content: "La tua mini colonia Pikmin: costruisci, evolvi, difendi." },
    ],
  }),
});

function VillaggioPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role ?? "lorenzo";

  const [base, setBase] = useState<BaseRow | null>(null);
  const [buildings, setBuildings] = useState<BaseBuilding[]>([]);
  const [catalog, setCatalog] = useState<BuildingCatalog[]>([]);
  const [coins, setCoins] = useState(0);
  const [gifts, setGifts] = useState<BaseGift[]>([]);
  const [walls, setWalls] = useState<WallSegment[]>([]);
  const [events, setEvents] = useState<VillageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [festa, setFesta] = useState<string | null>(null);
  const [phase, setPhase] = useState<DayPhase>(() => getDayPhase());
  const [pikminCount, setPikminCount] = useState(0);
  const [pikminBreakdown, setPikminBreakdown] = useState<Record<string, number>>({});
  const [nearbyThreats, setNearbyThreats] = useState<NearbyThreat[]>([]);
  const [openPanel, setOpenPanel] = useState<VillageMenuKey | null>(null);
  const [placing, setPlacing] = useState<BuildingCatalog | null>(null);
  const [pikminPrefs, setPikminPrefs] = useState<PikminLayerPrefs>(() => loadPikminPrefs());
  const prevBuildingsRef = useRef<BaseBuilding[]>([]);

  useEffect(() => { const i = setInterval(() => setPhase(getDayPhase()), 60_000); return () => clearInterval(i); }, []);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);

  const reload = async () => {
    const [b, bld, cat, c, g, w, ev, pc, sq] = await Promise.all([
      getBase(agent), listBuildings(agent), fetchCatalog(), getCoins(agent),
      listGifts(agent), listWalls(agent), listOpenEvents(agent),
      getPikminCount().catch(() => 0),
      supabase.from("pikmin_squad").select("breakdown").eq("id", "team").maybeSingle(),
    ]);
    setBase(b); setBuildings(bld); setCatalog(cat); setCoins(c); setGifts(g);
    setWalls(w); setEvents(ev); setPikminCount(pc);
    const raw = (sq.data?.breakdown ?? {}) as Record<string, unknown>;
    const aliases: Record<string, string> = { rosso: "red", blu: "blue", giallo: "yellow", viola: "purple", bianco: "white" };
    const map: Record<string, number> = {};
    for (const [k, n] of Object.entries(raw)) {
      const key = aliases[k.toLowerCase()] ?? k;
      const num = Number(n) || 0;
      if (num > 0) map[key] = (map[key] ?? 0) + num;
    }
    setPikminBreakdown(map);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("villaggio:" + agent)
      .on("postgres_changes", { event: "*", schema: "public", table: "base_buildings", filter: `agent=eq.${agent}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "bases", filter: `agent=eq.${agent}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "base_gifts", filter: `to_agent=eq.${agent}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "village_events", filter: `agent=eq.${agent}` }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  useEffect(() => {
    if (!base?.faction || base.lat == null || base.lng == null) return;
    const baseLat = base.lat, baseLng = base.lng;
    const totalDefense = computeVillageStatus(base.faction as FactionKey, buildings, catalog).defenseRating + wallDefenseBonus(walls);
    const refreshNearby = async () => {
      const { data: spawns } = await supabase
        .from("map_enemy_spawns")
        .select("id, enemy_id, lat, lng, active, defeated_at, expires_at")
        .eq("active", true).is("defeated_at", null);
      const now = Date.now();
      const live = (spawns ?? []).filter((s: any) => !s.expires_at || new Date(s.expires_at).getTime() > now);
      if (live.length === 0) { setNearbyThreats([]); return; }
      const ids = Array.from(new Set(live.map((s: any) => s.enemy_id)));
      const { data: enemies } = await supabase.from("enemies").select("id,name,emoji,danger_level").in("id", ids);
      const emap = new Map((enemies ?? []).map((e: any) => [e.id, e]));
      setNearbyThreats(computeNearbyThreats({ lat: baseLat, lng: baseLng },
        live.map((s: any) => ({ id: s.id, lat: s.lat, lng: s.lng, enemy: emap.get(s.enemy_id) ?? null }))));
    };
    refreshNearby();
    scanThreats({ agent, baseLat, baseLng, totalDefense, force: true }).then(({ created, auto }) => { if (created || auto) reload(); });
    const id = setInterval(() => {
      refreshNearby();
      scanThreats({ agent, baseLat, baseLng, totalDefense }).then(({ created, auto }) => { if (created || auto) reload(); });
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, base?.faction, base?.lat, base?.lng, walls.length, buildings.length]);

  useEffect(() => {
    if (!base || phase !== "notte") return;
    const totalDefense = computeVillageStatus(base.faction as FactionKey, buildings, catalog).defenseRating + wallDefenseBonus(walls);
    const run = () => maybeTriggerNightEvent({ agent, isNight: true, totalDefense }).then((ev) => { if (ev) reload(); });
    run();
    const id = setInterval(run, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, phase, buildings.length, walls.length]);

  useEffect(() => {
    const prev = prevBuildingsRef.current;
    for (const b of buildings) {
      const old = prev.find((p) => p.id === b.id);
      if (old && old.status !== "idle" && b.status === "idle" && b.level > old.level) {
        const cat = catalog.find((c) => c.key === b.type);
        setFesta(`${cat?.name ?? b.type} · Lv ${b.level}`);
        break;
      }
    }
    prevBuildingsRef.current = buildings;
    const due = buildings.filter((b) => b.status !== "idle" && b.build_end_at && new Date(b.build_end_at).getTime() <= Date.now());
    if (due.length) {
      (async () => { for (const b of due) await completeBuilding(b); reload(); })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, buildings]);

  if (loading) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-background text-sm text-muted-foreground">
        Carico il villaggio…
      </div>
    );
  }
  if (!base) return <Onboarding agent={agent} onCreated={reload} />;
  if (!base.faction) return <FactionSelector agent={agent} onChosen={reload} />;

  const baseStatus = computeVillageStatus(base.faction as FactionKey, buildings, catalog);
  const wallBonus = wallDefenseBonus(walls);
  const status = { ...baseStatus, defenseRating: baseStatus.defenseRating + wallBonus };
  const threatActive = nearbyThreats.length > 0 || events.some((e) => !e.resolved_at);

  const onPlace = async (pct: { x: number; y: number }) => {
    if (!placing) return;
    try {
      await startBuilding(agent, placing, pct);
      sfx.build();
      setPlacing(null);
      reload();
    } catch (e: any) {
      alert(e.message);
      setPlacing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-10 overflow-hidden bg-background">
      <CelebrationOverlay show={!!festa} label={festa ?? ""} onDone={() => setFesta(null)} />

      {/* ─── MAPPA FULLSCREEN (Phaser RTS 2.5D) ─── */}
      <VillageGameCanvas
        agent={agent}
        biomeKey={base.theme}
        buildings={buildings}
        catalog={catalog}
        pikminBreakdown={pikminBreakdown}
        pikminMaxVisible={pikminPrefs?.maxCap ?? 18}
        placement={placing}
        onPlacePosition={onPlace}
      />

      {/* ─── FIXED TOP HUD ─── */}
      <div
        className="absolute top-0 inset-x-0 z-30 px-2 pt-2 pointer-events-none"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="panel-strong px-3 py-1.5 backdrop-blur-md flex items-center gap-2 pointer-events-auto">
            <span className="text-base">🚩</span>
            <div className="leading-tight">
              <p className="text-[11px] font-display text-glow truncate max-w-[150px]">
                {base.base_name ?? base.name}
              </p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Lv {base.level} · {buildings.filter((b) => b.status === "idle").length} strutture
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 pointer-events-auto">
            <span className="panel-strong px-2 py-1 text-[11px] flex items-center gap-1 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-primary" /> {coins}
            </span>
            {threatActive && (
              <button
                onClick={() => setOpenPanel("defense")}
                className="panel-strong px-2 py-1 text-[10px] flex items-center gap-1 bg-rose-500/20 border border-rose-500/40 animate-pulse"
              >
                <AlertTriangle className="h-3 w-3 text-rose-400" />
                {nearbyThreats.length > 0 ? `${nearbyThreats.length} minacce` : "Allarme"}
              </button>
            )}
            {status.threatLevel === "allarme" && !threatActive && (
              <span className="panel-strong px-2 py-1 text-[10px] flex items-center gap-1 text-amber-400">
                <ShieldAlert className="h-3 w-3" /> Difese basse
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── REGALI (chip flottante) ─── */}
      {gifts.length > 0 && (
        <div className="absolute top-20 right-2 z-30 max-w-[240px] space-y-1">
          {gifts.slice(0, 2).map((g) => (
            <div key={g.id} className="panel-strong p-2 flex items-center gap-2 text-[10px] backdrop-blur-md">
              <Gift className="h-3 w-3 text-primary shrink-0" />
              <span className="flex-1 truncate">Da <b>{g.from_agent}</b></span>
              <button
                onClick={async () => { hapticTap(); sfx.gift(); await claimGift(agent, g); reload(); }}
                className="btn-neon px-2 py-0.5 text-[9px]">
                Ritira
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── PLACEMENT CANCEL ─── */}
      {placing && (
        <div className="absolute bottom-24 inset-x-0 z-40 flex justify-center pointer-events-none">
          <button
            onClick={() => setPlacing(null)}
            className="panel-strong px-4 py-2 text-xs pointer-events-auto"
          >
            Annulla posizionamento <b className="text-primary ml-1">{placing.name}</b>
          </button>
        </div>
      )}

      {/* ─── BOTTOM MENU ─── */}
      <VillageBottomMenu active={openPanel} onOpen={setOpenPanel} />

      {/* ─── PANELS ─── */}
      <BuildPanel
        open={openPanel === "build"}
        onOpenChange={(o) => setOpenPanel(o ? "build" : null)}
        agent={agent}
        coins={coins}
        catalog={catalog}
        buildings={buildings}
        onRequestPlacement={(c) => setPlacing(c)}
        onRefresh={reload}
      />
      <DefensePanel
        open={openPanel === "defense"}
        onOpenChange={(o) => setOpenPanel(o ? "defense" : null)}
        agent={agent}
        walls={walls}
        coins={coins}
        status={status}
        onRefresh={reload}
      />
      <BonusPanel
        open={openPanel === "bonus"}
        onOpenChange={(o) => setOpenPanel(o ? "bonus" : null)}
        status={status}
      />
      <AestheticsPanel
        open={openPanel === "aesthetic"}
        onOpenChange={(o) => setOpenPanel(o ? "aesthetic" : null)}
        agent={agent}
        base={base}
        prefs={pikminPrefs}
        onPrefsChange={setPikminPrefs}
        onBaseChange={setBase}
        onRefresh={reload}
      />
      <PikminPanel
        open={openPanel === "pikmin"}
        onOpenChange={(o) => setOpenPanel(o ? "pikmin" : null)}
        total={pikminCount}
        breakdown={pikminBreakdown}
      />
    </div>
  );
}

// ===== ONBOARDING (immutato in essenza) =====
function Onboarding({ agent, onCreated }: { agent: string; onCreated: () => void }) {
  const [name, setName] = useState(agent === "papa" ? "Base Comando" : "Avamposto Lorenzo");
  const [theme, setTheme] = useState("foresta");
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto pt-6 space-y-4">
        <header>
          <p className="text-[11px] uppercase tracking-[0.3em] text-primary/80">// Nuovo villaggio</p>
          <h1 className="font-display text-2xl text-glow mt-1">Fonda la tua colonia</h1>
        </header>
        <div className="panel-strong p-4 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-primary">Nome base</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full bg-night/60 border border-primary/30 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary mb-2">Bioma di partenza</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(THEMES).map(([key, t]) => (
                <button key={key}
                  onClick={() => { hapticTap(); setTheme(key); }}
                  className={`panel p-3 text-left ${theme === key ? "ring-2 ring-primary" : ""}`}>
                  <div className="h-14 rounded-md mb-2"
                    style={{ background: `linear-gradient(180deg, ${t.sky}, ${t.ground})` }} />
                  <p className="text-sm font-semibold">{t.label}</p>
                </button>
              ))}
            </div>
          </div>
          <button disabled={busy || !name.trim()}
            onClick={async () => {
              hapticTap(); setBusy(true);
              try {
                let lat: number | null = null, lng: number | null = null;
                if (navigator.geolocation) {
                  await new Promise<void>((res) => {
                    navigator.geolocation.getCurrentPosition(
                      (p) => { lat = p.coords.latitude; lng = p.coords.longitude; res(); },
                      () => res(), { timeout: 5000 });
                  });
                }
                await createBase(agent, { name: name.trim(), theme, lat, lng });
                onCreated();
              } catch (e: any) { alert(e.message); } finally { setBusy(false); }
            }}
            className="btn-neon w-full py-3 text-sm">
            {busy ? "Sto piantando la prima radice…" : "Fonda il villaggio"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
