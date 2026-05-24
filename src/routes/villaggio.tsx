import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { CelebrationOverlay } from "@/components/CelebrationOverlay";
import { getSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { hapticTap } from "@/lib/haptic";
import { getCoins } from "@/lib/coins";
import { sfx } from "@/lib/sfx";
import { getDayPhase, phaseOverlay, PHASE_LABEL, PHASE_EMOJI, type DayPhase } from "@/lib/daycycle";
import {
  BaseRow,
  BaseBuilding,
  BuildingCatalog,
  THEMES,
  PARTNER_OF,
  fetchCatalog,
  getBase,
  listBuildings,
  createBase,
  startBuilding,
  startUpgrade,
  completeBuilding,
  costForLevel,
  buildingStage,
  formatRemaining,
  listGifts,
  claimGift,
  BaseGift,
} from "@/lib/base";
import { Sparkles, Hammer, Gift, ArrowUpRight, Users, ShieldPlus, Palette } from "lucide-react";
import { FactionSelector } from "@/components/village/FactionSelector";
import { WallEditor } from "@/components/village/WallEditor";
import { VillageCustomizer } from "@/components/village/VillageCustomizer";
import { VillageCanvas } from "@/components/village/VillageCanvas";
import { VillageHud } from "@/components/village/VillageHud";
import { VillageStatsPanel } from "@/components/village/VillageStatsPanel";
import { VillageActions } from "@/components/village/VillageActions";
import { ThreatAlertPanel, computeNearbyThreats, type NearbyThreat } from "@/components/village/ThreatAlertPanel";
import { computeVillageStatus } from "@/lib/village/bonuses";
import type { FactionKey } from "@/lib/village/factions";
import { listWalls, wallDefenseBonus, type WallSegment } from "@/lib/village/walls";
import { listOpenEvents, scanThreats, type VillageEvent } from "@/lib/village/threats";
import { getCosmetics, type VillageCosmetics } from "@/lib/village/cosmetics";
import { maybeTriggerNightEvent } from "@/lib/village/night";
import { getPikminCount } from "@/lib/pikmin";
import { VillagePikminLayer } from "@/components/pikmin/VillagePikminLayer";
import type { PikminType } from "@/data/pikminSprites";


export const Route = createFileRoute("/villaggio")({
  component: VillaggioPage,
  head: () => ({
    meta: [
      { title: "Villaggio Pikmin · Base evolutiva" },
      { name: "description", content: "Costruisci, evolvi e visita la base Pikmin." },
    ],
  }),
});

function VillaggioPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role ?? "lorenzo";
  const partner = PARTNER_OF[agent];

  const [base, setBase] = useState<BaseRow | null>(null);
  const [buildings, setBuildings] = useState<BaseBuilding[]>([]);
  const [catalog, setCatalog] = useState<BuildingCatalog[]>([]);
  const [coins, setCoins] = useState(0);
  const [gifts, setGifts] = useState<BaseGift[]>([]);
  const [walls, setWalls] = useState<WallSegment[]>([]);
  const [events, setEvents] = useState<VillageEvent[]>([]);
  const [wallEditorOpen, setWallEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [picker, setPicker] = useState<BuildingCatalog | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [selected, setSelected] = useState<BaseBuilding | null>(null);
  const [festa, setFesta] = useState<string | null>(null);
  const [phase, setPhase] = useState<DayPhase>(() => getDayPhase());
  const [pikminCount, setPikminCount] = useState(0);
  const [nearbyThreats, setNearbyThreats] = useState<import("@/components/village/ThreatAlertPanel").NearbyThreat[]>([]);
  const prevBuildingsRef = useRef<BaseBuilding[]>([]);

  // refresh day phase every minute
  useEffect(() => {
    const i = setInterval(() => setPhase(getDayPhase()), 60_000);
    return () => clearInterval(i);
  }, []);


  // realtime tick per i timer
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [pikminBreakdown, setPikminBreakdown] = useState<Partial<Record<PikminType, number>>>({});

  const reload = async () => {
    const [b, bld, cat, c, g, w, ev, pc, sq] = await Promise.all([
      getBase(agent),
      listBuildings(agent),
      fetchCatalog(),
      getCoins(agent),
      listGifts(agent),
      listWalls(agent),
      listOpenEvents(agent),
      getPikminCount().catch(() => 0),
      supabase.from("pikmin_squad").select("breakdown").eq("id", "team").maybeSingle(),
    ]);
    setBase(b);
    setBuildings(bld);
    setCatalog(cat);
    setCoins(c);
    setGifts(g);
    setWalls(w);
    setEvents(ev);
    setPikminCount(pc);
    const raw = (sq.data?.breakdown ?? {}) as Record<string, number>;
    const map: Partial<Record<PikminType, number>> = {};
    const norm = (k: string): PikminType | null => {
      const v = k.toLowerCase();
      if (["red", "rosso"].includes(v)) return "red";
      if (["blue", "blu"].includes(v)) return "blue";
      if (["yellow", "giallo"].includes(v)) return "yellow";
      if (["purple", "viola"].includes(v)) return "purple";
      if (["white", "bianco"].includes(v)) return "white";
      return null;
    };
    for (const [k, n] of Object.entries(raw)) {
      const c2 = norm(k);
      if (c2) map[c2] = (map[c2] ?? 0) + (Number(n) || 0);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "village_walls", filter: `agent=eq.${agent}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "village_events", filter: `agent=eq.${agent}` }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  // Scansione minacce: al load + ogni 60s, e calcolo "nearbyThreats" reali da spawn attivi
  useEffect(() => {
    if (!base?.faction || base.lat == null || base.lng == null) return;
    const baseLat = base.lat;
    const baseLng = base.lng;
    const totalDefense = computeVillageStatus(base.faction as FactionKey, buildings, catalog).defenseRating + wallDefenseBonus(walls);

    const refreshNearby = async () => {
      // Carica solo spawn attivi, non sconfitti e non scaduti (allineato alla mappa)
      const { data: spawns } = await supabase
        .from("map_enemy_spawns")
        .select("id, enemy_id, lat, lng, active, defeated_at, expires_at")
        .eq("active", true)
        .is("defeated_at", null);
      const now = Date.now();
      const live = (spawns ?? []).filter(
        (s: any) => !s.expires_at || new Date(s.expires_at).getTime() > now,
      );
      if (live.length === 0) {
        setNearbyThreats([]);
        return;
      }
      const ids = Array.from(new Set(live.map((s: any) => s.enemy_id)));
      const { data: enemies } = await supabase.from("enemies").select("id,name,emoji,danger_level").in("id", ids);
      const emap = new Map((enemies ?? []).map((e: any) => [e.id, e]));
      setNearbyThreats(
        computeNearbyThreats({ lat: baseLat, lng: baseLng }, live.map((s: any) => ({
          id: s.id, lat: s.lat, lng: s.lng, enemy: emap.get(s.enemy_id) ?? null,
        }))),
      );
    };

    refreshNearby();
    scanThreats({ agent, baseLat, baseLng, totalDefense, force: true }).then(({ created, auto }) => {
      if (created || auto) reload();
    });
    const id = setInterval(() => {
      refreshNearby();
      scanThreats({ agent, baseLat, baseLng, totalDefense }).then(({ created, auto }) => {
        if (created || auto) reload();
      });
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, base?.faction, base?.lat, base?.lng, walls.length, buildings.length]);


  // Eventi notturni: solo durante la notte, ~ogni 5 minuti
  useEffect(() => {
    if (!base || phase !== "notte") return;
    const totalDefense = computeVillageStatus(base.faction as FactionKey, buildings, catalog).defenseRating + wallDefenseBonus(walls);
    const run = () => maybeTriggerNightEvent({ agent, isNight: true, totalDefense }).then((ev) => {
      if (ev) reload();
    });
    run();
    const id = setInterval(run, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, phase, buildings.length, walls.length]);

  // auto-complete dei timer scaduti + festa al completamento
  useEffect(() => {
    const prev = prevBuildingsRef.current;
    // detect completions: was non-idle, now idle with higher level
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
      (async () => {
        for (const b of due) await completeBuilding(b);
        reload();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, buildings]);


  const theme = THEMES[base?.theme ?? "foresta"] ?? THEMES.foresta;
  const totalLevel = useMemo(() => buildings.reduce((a, b) => a + b.level, 0), [buildings]);

  if (loading) {
    return (
      <PageShell title="Villaggio" subtitle="Caricamento…">
        <div className="panel p-8 text-center text-muted-foreground text-sm">Carico il villaggio…</div>
      </PageShell>
    );
  }

  if (!base) {
    return <Onboarding agent={agent} onCreated={reload} />;
  }

  // Onboarding fazione: base esiste ma faction non scelta
  if (!base.faction) {
    return <FactionSelector agent={agent} onChosen={reload} />;
  }

  const baseStatus = computeVillageStatus(base.faction as FactionKey, buildings, catalog);
  const wallBonus = wallDefenseBonus(walls);
  const status = { ...baseStatus, defenseRating: baseStatus.defenseRating + wallBonus };
  const cosmetics: VillageCosmetics = getCosmetics(base.layout);

  return (
    <PageShell
      title={base.name}
      subtitle={`Lv ${base.level} · ${theme.label} · ${PHASE_EMOJI[phase]} ${PHASE_LABEL[phase]} · ${totalLevel}⭐`}
      action={
        <div className="flex items-center gap-2">
          <span className="panel px-2 py-1 text-[11px] flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" /> {coins}
          </span>
          <Link
            to="/villaggio/$agent"
            params={{ agent: partner }}
            onClick={hapticTap}
            className="panel px-2 py-1 text-[11px] flex items-center gap-1"
          >
            <Users className="h-3 w-3" /> {partner}
          </Link>
        </div>
      }
    >
      <CelebrationOverlay show={!!festa} label={festa ?? ""} onDone={() => setFesta(null)} />

      {/* HUD AGENTE */}
      <VillageHud session={session} base={base} status={status} coins={coins} pikminCount={pikminCount} />

      {/* STATS CAMPO BASE */}
      <VillageStatsPanel base={base} status={status} faction={base.faction as FactionKey} />

      {/* MINACCE: solo se reali entro raggio */}
      <ThreatAlertPanel threats={nearbyThreats} />

      {/* SCENA VILLAGGIO + PIKMIN ANIMATI */}
      <div className="relative">
        <VillageCanvas
          faction={base.faction as FactionKey}
          phase={phase}
          buildings={buildings}
          walls={walls}
          cosmetics={cosmetics}
          threat={nearbyThreats.length > 0}
          onSelectBuilding={setSelected}
          tick={tick}
        />
        <VillagePikminLayer
          buildings={buildings}
          pikminCount={pikminCount}
          breakdown={pikminBreakdown}
          threat={nearbyThreats.length > 0}
        />
      </div>

      {/* AZIONI RAPIDE */}
      <VillageActions
        onBuild={() => {
          const next = catalog.find((c) => !buildings.some((b) => b.type === c.key));
          if (next) setPicker(next);
        }}
        onWalls={() => setWallEditorOpen(true)}
        onCustomize={() => setCustomizerOpen(true)}
      />


      {/* GIFTS */}
      {gifts.length > 0 && (
        <div className="panel-strong p-3 space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Gift className="h-3 w-3" /> Regali ricevuti
          </p>
          {gifts.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-2 rounded-lg bg-night/60 p-2 border border-primary/15">
              <div className="text-xs">
                <p className="text-foreground">Da <b>{g.from_agent}</b></p>
                <p className="text-muted-foreground">
                  {g.payload.coins ? `💰 ${g.payload.coins} ` : ""}
                  {(g.payload.ingredients ?? []).map((k) => `🍃${k} `).join("")}
                </p>
                {g.message && <p className="italic text-muted-foreground">"{g.message}"</p>}
              </div>
              <button
                onClick={async () => {
                  hapticTap();
                  sfx.gift();
                  await claimGift(agent, g);
                  reload();
                }}
                className="btn-neon px-2 py-1 text-[10px]"
              >
                Ritira
              </button>
            </div>
          ))}
        </div>
      )}

      {/* QUICK LINKS */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/villaggio/edifici"
          onClick={hapticTap}
          className="panel-strong p-3 flex items-center gap-2 active:scale-95 transition"
        >
          <span className="text-2xl">🏗️</span>
          <div className="flex-1">
            <p className="text-xs font-semibold">Edifici</p>
            <p className="text-[10px] text-muted-foreground">Catalogo & buff</p>
          </div>
        </Link>
        <Link
          to="/villaggio/scambi"
          onClick={hapticTap}
          className="panel-strong p-3 flex items-center gap-2 active:scale-95 transition"
        >
          <span className="text-2xl">🤝</span>
          <div className="flex-1">
            <p className="text-xs font-semibold">Scambi</p>
            <p className="text-[10px] text-muted-foreground">Ambasciata Pikmin</p>
          </div>
        </Link>
      </div>

      {/* COSTRUISCI */}
      <div className="panel p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Hammer className="h-3 w-3" /> Catalogo strutture
          </p>
          <span className="text-[10px] text-muted-foreground">Tocca per costruire</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {catalog.map((c) => {
            const owned = buildings.find((b) => b.type === c.key);
            return (
              <button
                key={c.key}
                onClick={() => {
                  hapticTap();
                  if (owned) setSelected(owned);
                  else setPicker(c);
                }}
                className="panel relative p-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-[10px] text-center leading-tight">{c.name}</span>
                {owned ? (
                  <span className="text-[9px] text-primary">Lv {owned.level}</span>
                ) : (
                  <span className="text-[9px] text-muted-foreground">{c.base_cost_coins}💰</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MODAL PICKER NUOVA COSTRUZIONE */}
      <AnimatePresence>
        {picker && (
          <BuildModal
            catalog={picker}
            coins={coins}
            onClose={() => setPicker(null)}
            onConfirm={async (pos) => {
              try {
                await startBuilding(agent, picker, pos);
                sfx.build();
                setPicker(null);
                reload();
              } catch (e: any) {
                alert(e.message);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* MODAL EDITOR MURA */}
      <AnimatePresence>
        {wallEditorOpen && (
          <WallEditor
            agent={agent}
            walls={walls}
            coins={coins}
            onClose={() => setWallEditorOpen(false)}
            onChange={reload}
          />
        )}
      </AnimatePresence>

      {/* MODAL CUSTOMIZER ESTETICA */}
      <AnimatePresence>
        {customizerOpen && (
          <VillageCustomizer
            agent={agent}
            initial={cosmetics}
            onClose={() => setCustomizerOpen(false)}
            onSaved={reload}
          />
        )}
      </AnimatePresence>

      {/* MODAL DETTAGLIO STRUTTURA */}
      <AnimatePresence>
        {selected && (
          <BuildingDetail
            building={selected}
            catalog={catalog.find((c) => c.key === selected.type)!}
            agent={agent}
            coins={coins}
            onClose={() => setSelected(null)}
            onRefresh={reload}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

// ===== ONBOARDING =====
function Onboarding({ agent, onCreated }: { agent: string; onCreated: () => void }) {
  const [name, setName] = useState(agent === "papa" ? "Base Comando" : "Avamposto Lorenzo");
  const [theme, setTheme] = useState("foresta");
  const [busy, setBusy] = useState(false);

  return (
    <PageShell title="Crea il tuo villaggio" subtitle="Scegli nome e bioma. Potrai cambiarli dopo.">
      <div className="panel-strong p-4 space-y-4">
        <div>
          <label className="text-[11px] uppercase tracking-widest text-primary">Nome base</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full bg-night/60 border border-primary/30 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-primary mb-2">Bioma di partenza</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => {
                  hapticTap();
                  setTheme(key);
                }}
                className={`panel p-3 text-left ${theme === key ? "ring-2 ring-primary" : ""}`}
              >
                <div
                  className="h-14 rounded-md mb-2"
                  style={{ background: `linear-gradient(180deg, ${t.sky}, ${t.ground})` }}
                />
                <p className="text-sm font-semibold">{t.label}</p>
              </button>
            ))}
          </div>
        </div>
        <button
          disabled={busy || !name.trim()}
          onClick={async () => {
            hapticTap();
            setBusy(true);
            try {
              let lat: number | null = null;
              let lng: number | null = null;
              if (navigator.geolocation) {
                await new Promise<void>((res) => {
                  navigator.geolocation.getCurrentPosition(
                    (p) => {
                      lat = p.coords.latitude;
                      lng = p.coords.longitude;
                      res();
                    },
                    () => res(),
                    { timeout: 5000 },
                  );
                });
              }
              await createBase(agent, { name: name.trim(), theme, lat, lng });
              onCreated();
            } catch (e: any) {
              alert(e.message);
            } finally {
              setBusy(false);
            }
          }}
          className="btn-neon w-full py-3 text-sm"
        >
          {busy ? "Sto piantando la prima radice…" : "Fonda il villaggio"}
        </button>
      </div>
    </PageShell>
  );
}





// ===== MODAL: build new =====
function BuildModal({
  catalog,
  coins,
  onClose,
  onConfirm,
}: {
  catalog: BuildingCatalog;
  coins: number;
  onClose: () => void;
  onConfirm: (pos: { x: number; y: number }) => void;
}) {
  const cost = costForLevel(catalog, 1);
  const canAfford = coins >= cost.coins;
  const [pos] = useState({ x: 20 + Math.random() * 60, y: 10 + Math.random() * 40 });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-night/80 backdrop-blur flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="panel-strong w-full max-w-md p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl">{catalog.emoji}</span>
          <div>
            <h3 className="font-display text-lg">{catalog.name}</h3>
            <p className="text-xs text-muted-foreground">{catalog.description}</p>
          </div>
        </div>
        <div className="rounded-lg bg-night/60 border border-primary/15 p-3 space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Costo</span><span>{cost.coins} 💰</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tempo</span><span>{cost.minutes} min</span></div>
          {cost.ingredients.length > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">Ingredienti</span><span>{cost.ingredients.join(", ")}</span></div>
          )}
          {Object.keys(catalog.bonus_per_level ?? {}).length > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">Bonus / lv</span><span>{Object.entries(catalog.bonus_per_level).map(([k, v]) => `+${v} ${k}`).join(", ")}</span></div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="panel flex-1 py-2 text-xs">Annulla</button>
          <button
            disabled={!canAfford}
            onClick={() => onConfirm(pos)}
            className="btn-neon flex-1 py-2 text-xs disabled:opacity-50"
          >
            {canAfford ? "Costruisci" : "Monete insufficienti"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===== MODAL: building detail =====
function BuildingDetail({
  building,
  catalog,
  agent,
  coins,
  onClose,
  onRefresh,
}: {
  building: BaseBuilding;
  catalog: BuildingCatalog;
  agent: string;
  coins: number;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const busy = building.status !== "idle";
  const nextCost = building.level < catalog.max_level ? costForLevel(catalog, building.level + 1) : null;
  const remaining = formatRemaining(building.build_end_at);
  void tick;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-night/80 backdrop-blur flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="panel-strong w-full max-w-md p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl">{catalog.emoji}</span>
          <div className="flex-1">
            <h3 className="font-display text-lg">{catalog.name}</h3>
            <p className="text-xs text-muted-foreground">Lv {building.level} / {catalog.max_level} · {buildingStage(building.level)}</p>
          </div>
        </div>
        {busy && (
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-primary">In costruzione</p>
            <p className="font-display text-lg text-glow mt-1">{remaining}</p>
          </div>
        )}
        {!busy && nextCost && (
          <div className="rounded-lg bg-night/60 border border-primary/15 p-3 text-xs space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-primary mb-1">Upgrade Lv {building.level + 1}</p>
            <div className="flex justify-between"><span className="text-muted-foreground">Costo</span><span>{nextCost.coins} 💰</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tempo</span><span>{nextCost.minutes} min</span></div>
            {nextCost.ingredients.length > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Ingredienti</span><span>{nextCost.ingredients.join(", ")}</span></div>
            )}
          </div>
        )}
        {!busy && !nextCost && (
          <p className="text-center text-xs text-primary">Struttura al livello massimo!</p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="panel flex-1 py-2 text-xs">Chiudi</button>
          {!busy && nextCost && (
            <button
              disabled={coins < nextCost.coins}
              onClick={async () => {
                try {
                  await startUpgrade(agent, building, catalog);
                  sfx.upgrade();
                  onRefresh();
                  onClose();
                } catch (e: any) {
                  alert(e.message);
                }
              }}
              className="btn-neon flex-1 py-2 text-xs flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <ArrowUpRight className="h-3 w-3" /> Evolvi
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
