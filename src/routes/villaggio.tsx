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
import { Sparkles, Hammer, Gift, ArrowUpRight, Users } from "lucide-react";
import { FactionSelector } from "@/components/village/FactionSelector";
import { VillageStatusBar } from "@/components/village/VillageStatusBar";
import { VillageAtmosphere } from "@/components/village/VillageAtmosphere";
import { PikminLife } from "@/components/village/PikminLife";
import { computeVillageStatus } from "@/lib/village/bonuses";
import type { FactionKey } from "@/lib/village/factions";


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
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [picker, setPicker] = useState<BuildingCatalog | null>(null);
  const [selected, setSelected] = useState<BaseBuilding | null>(null);
  const [festa, setFesta] = useState<string | null>(null);
  const [phase, setPhase] = useState<DayPhase>(() => getDayPhase());
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

  const reload = async () => {
    const [b, bld, cat, c, g] = await Promise.all([
      getBase(agent),
      listBuildings(agent),
      fetchCatalog(),
      getCoins(agent),
      listGifts(agent),
    ]);
    setBase(b);
    setBuildings(bld);
    setCatalog(cat);
    setCoins(c);
    setGifts(g);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("villaggio:" + agent)
      .on("postgres_changes", { event: "*", schema: "public", table: "base_buildings", filter: `agent=eq.${agent}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "bases", filter: `agent=eq.${agent}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "base_gifts", filter: `to_agent=eq.${agent}` }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

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

      {/* SCENA */}
      <motion.div
        key={base.theme + phase}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <BaseScene theme={theme} buildings={buildings} catalog={catalog} onSelect={setSelected} phase={phase} />
      </motion.div>

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

// ===== SCENA =====
function BaseScene({
  theme,
  buildings,
  catalog,
  onSelect,
  phase,
}: {
  theme: { sky: string; ground: string; accent: string; label: string };
  buildings: BaseBuilding[];
  catalog: BuildingCatalog[];
  onSelect: (b: BaseBuilding) => void;
  phase: DayPhase;
}) {
  const cat = (k: string) => catalog.find((c) => c.key === k);
  const overlay = phaseOverlay(phase);
  const isNight = phase === "notte";
  const isDusk = phase === "tramonto" || phase === "alba";
  return (
    <div className="panel-strong relative overflow-hidden p-0" style={{ aspectRatio: "16 / 11" }}>
      {/* Cielo bioma */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${theme.sky} 0%, ${theme.sky} 55%, ${theme.ground} 100%)` }}
      />
      {/* Day/night overlay */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000" style={{ background: overlay.background }} />

      {/* Sole / Luna */}
      {!isNight ? (
        <motion.div
          className="absolute h-12 w-12 rounded-full"
          style={{
            background: isDusk
              ? "radial-gradient(circle, #ffe9b8, #fb923c 70%, transparent)"
              : "radial-gradient(circle, #fff8c5, #ffd86b 70%, transparent)",
            top: 16,
            right: 18,
            filter: isDusk ? "drop-shadow(0 0 12px #fb923c88)" : "drop-shadow(0 0 8px #ffd86b88)",
          }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      ) : (
        <>
          <motion.div
            className="absolute h-10 w-10 rounded-full"
            style={{
              background: "radial-gradient(circle, #f8fafc, #cbd5e1 65%, transparent)",
              top: 18,
              right: 22,
              filter: "drop-shadow(0 0 14px #cbd5e188)",
            }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          {/* stelle */}
          {Array.from({ length: 14 }).map((_, i) => {
            const top = 6 + Math.random() * 30;
            const left = Math.random() * 100;
            const dur = 1.6 + Math.random() * 2;
            return (
              <motion.span
                key={`s${i}`}
                className="absolute text-[8px]"
                style={{ top: `${top}%`, left: `${left}%`, color: "#fff" }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: dur, repeat: Infinity, delay: i * 0.13 }}
              >
                ✦
              </motion.span>
            );
          })}
        </>
      )}

      {/* Nuvole (più trasparenti di notte) */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute h-4 w-12 rounded-full"
          style={{ top: 24 + i * 18, left: -50, background: isNight ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.75)" }}
          animate={{ x: [0, 380] }}
          transition={{ duration: 22 + i * 6, repeat: Infinity, ease: "linear", delay: i * 4 }}
        />
      ))}

      {/* Terreno */}
      <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: `linear-gradient(180deg, transparent, ${theme.ground})` }} />

      {/* Edifici */}
      {buildings.map((b) => {
        const c = cat(b.type);
        if (!c) return null;
        const stage = buildingStage(b.level);
        const scale = stage === "maestro" ? 1.25 : stage === "evoluto" ? 1.1 : 1;
        const isBuilding = b.status !== "idle";
        return (
          <motion.button
            key={b.id}
            onClick={() => {
              hapticTap();
              sfx.tap();
              onSelect(b);
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute flex flex-col items-center"
            style={{
              left: `${b.position_x}%`,
              bottom: `${b.position_y}%`,
              transform: `translate(-50%, 50%) scale(${scale})`,
            }}
          >
            {/* Aura maestro */}
            {stage === "maestro" && (
              <motion.span
                aria-hidden
                className="absolute inset-0 -z-0 rounded-full"
                style={{ background: "radial-gradient(circle, #fde68a55, transparent 70%)" }}
                animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.6, 0.2, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
            )}
            <motion.span
              className="text-3xl drop-shadow-lg relative"
              animate={isBuilding ? { y: [0, -3, 0], rotate: [-2, 2, -2] } : { y: 0 }}
              transition={isBuilding ? { duration: 1.2, repeat: Infinity } : undefined}
            >
              {c.emoji}
              {isBuilding && (
                <motion.span
                  className="absolute -top-3 -right-2 text-sm"
                  animate={{ rotate: [-12, 12, -12] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  🔨
                </motion.span>
              )}
            </motion.span>
            {/* Pikmin che trasportano pezzi durante la costruzione */}
            {isBuilding &&
              [0, 1].map((k) => (
                <motion.span
                  key={k}
                  className="absolute text-[11px]"
                  style={{ bottom: -6, left: "50%" }}
                  initial={{ x: -18 + k * 36, y: 0, opacity: 0 }}
                  animate={{ x: [-22, 22, -22], y: [0, -2, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 2.4 + k * 0.4, repeat: Infinity, delay: k * 0.6 }}
                >
                  🌱📦
                </motion.span>
              ))}
            {isBuilding ? (
              <span className="mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-night/80 text-primary border border-primary/40">
                🔨 {formatRemaining(b.build_end_at)}
              </span>
            ) : (
              <span className="mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-night/70 text-foreground/80 border border-primary/20">
                Lv {b.level}
              </span>
            )}
          </motion.button>
        );
      })}

      {/* Pikmin abitanti: camminano di giorno, dormono di notte */}
      {Array.from({ length: Math.min(5, 1 + buildings.length) }).map((_, i) => {
        const baseLeft = 10 + i * 14;
        if (isNight) {
          return (
            <div
              key={i}
              className="absolute"
              style={{ bottom: 4 + (i % 2) * 6, left: `${baseLeft}%` }}
            >
              <span className="text-base opacity-80">🌱</span>
              <motion.span
                className="absolute -top-3 left-3 text-[10px] text-white/80"
                animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.4 }}
              >
                💤
              </motion.span>
            </div>
          );
        }
        return (
          <motion.span
            key={i}
            className="absolute text-base"
            style={{ bottom: 6 + (i % 2) * 8 }}
            initial={{ left: `${baseLeft}%` }}
            animate={{ left: [`${baseLeft}%`, `${85 - i * 8}%`, `${baseLeft}%`] }}
            transition={{ duration: 14 + i * 3, repeat: Infinity, ease: "linear" }}
          >
            🌱
          </motion.span>
        );
      })}

      {/* Lucciole notturne */}
      {isNight &&
        Array.from({ length: 6 }).map((_, i) => (
          <motion.span
            key={`f${i}`}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ background: "#fde68a", boxShadow: "0 0 8px #fde68a" }}
            initial={{ left: `${10 + i * 14}%`, bottom: `${20 + (i % 3) * 18}%` }}
            animate={{
              left: [`${10 + i * 14}%`, `${30 + i * 10}%`, `${10 + i * 14}%`],
              bottom: [`${20 + (i % 3) * 18}%`, `${35 + (i % 3) * 10}%`, `${20 + (i % 3) * 18}%`],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{ duration: 4 + i * 0.6, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

      {buildings.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="panel px-3 py-2 text-xs text-center">Nessuna struttura. Scegli dal catalogo!</p>
        </div>
      )}

      {/* Badge fase */}
      <div className="absolute top-2 left-2 panel px-2 py-1 text-[10px] flex items-center gap-1">
        <span>{PHASE_EMOJI[phase]}</span>
        <span>{PHASE_LABEL[phase]}</span>
      </div>
    </div>
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
