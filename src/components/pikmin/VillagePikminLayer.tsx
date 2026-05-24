import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatedPikmin } from "./AnimatedPikmin";
import { PikminCustomizerModal } from "./PikminCustomizerModal";
import { usePikminSpecies, type PikminSpeciesRow } from "@/hooks/usePikminSpecies";
import {
  ANIMATION_LABEL,
  type PikminAnimation,
  type PikminType,
} from "@/data/pikminSprites";
import type { BaseBuilding } from "@/lib/base";

const MAX_PIKMIN = 30;
const LS_KEY = "village.pikminLayer.v2";

interface Prefs {
  show: boolean;
  count: number;
  speed: number;
  filters: Record<string, boolean>;
  night: boolean;
}

const DEFAULT_PREFS: Prefs = {
  show: true,
  count: 12,
  speed: 1,
  filters: {},
  night: false,
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...p, filters: { ...(p.filters ?? {}) } };
  } catch { return DEFAULT_PREFS; }
}

function savePrefs(p: Prefs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

interface Agent {
  id: number;
  speciesKey: string;
  name: string;
  x: number; y: number;
  tx: number; ty: number;
  speed: number;
  anim: PikminAnimation;
  flip: boolean;
  level: number;
  nextThinkAt: number;
}

interface Props {
  buildings: BaseBuilding[];
  pikminCount: number;
  threat?: boolean;
  breakdown?: Partial<Record<PikminType, number>>;
}

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

function randomAnim(): PikminAnimation {
  const r = Math.random();
  if (r < 0.18) return "idle";
  if (r < 0.5)  return "walk";
  if (r < 0.65) return "run";
  if (r < 0.78) return "carry";
  if (r < 0.9)  return "work";
  if (r < 0.97) return "celebrate";
  return "sleep";
}

/** Layer Pikmin del villaggio — specie e sprite caricati dinamicamente dal DB. */
export function VillagePikminLayer({ buildings, pikminCount, threat, breakdown }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [selected, setSelected] = useState<Agent | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const { species, refresh: refreshSpecies } = usePikminSpecies();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 600, h: 360 });

  useEffect(() => { savePrefs(prefs); }, [prefs]);

  // Inizializza filtri quando arrivano le specie
  useEffect(() => {
    if (!species.length) return;
    setPrefs((p) => {
      const next = { ...p.filters };
      let changed = false;
      for (const s of species) {
        if (next[s.key] === undefined) { next[s.key] = true; changed = true; }
      }
      return changed ? { ...p, filters: next } : p;
    });
  }, [species]);

  const speciesByKey = useMemo(() => {
    const m = new Map<string, PikminSpeciesRow>();
    for (const s of species) m.set(s.key, s);
    return m;
  }, [species]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const anchors = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (const b of buildings) {
      const x = (b.position_x / 100) * size.w;
      const y = size.h - (b.position_y * 0.55 / 100) * size.h - 30;
      pts.push({ x, y });
    }
    if (pts.length === 0) pts.push({ x: size.w / 2, y: size.h / 2 });
    return pts;
  }, [buildings, size]);

  const visibleCount = useMemo(() => {
    const base = prefs.count;
    if (!pikminCount) return Math.min(base, MAX_PIKMIN);
    return Math.min(MAX_PIKMIN, Math.max(3, Math.min(base, Math.ceil(pikminCount / 2))));
  }, [prefs.count, pikminCount]);

  // Pool di chiavi specie rispettando filtri + breakdown
  const speciesPool = useMemo<string[]>(() => {
    const enabled = species.filter((s) => prefs.filters[s.key] !== false);
    if (!enabled.length) return [];
    const total = enabled.reduce((a, s) => a + ((breakdown as any)?.[s.key] ?? 0), 0);
    const pool: string[] = [];
    if (total > 0) {
      for (const s of enabled) {
        const n = Math.max(0, Math.round((((breakdown as any)?.[s.key] ?? 0) / total) * visibleCount));
        for (let i = 0; i < n; i++) pool.push(s.key);
      }
    }
    while (pool.length < visibleCount) pool.push(enabled[pool.length % enabled.length].key);
    return pool.slice(0, visibleCount);
  }, [species, breakdown, prefs.filters, visibleCount]);

  const agentsRef = useRef<Agent[]>([]);
  const [agentsTick, setAgentsTick] = useState(0);

  useEffect(() => {
    const next: Agent[] = speciesPool.map((key, i) => {
      const old = agentsRef.current[i];
      const sp = speciesByKey.get(key);
      const a: Agent = {
        id: i,
        speciesKey: key,
        name: sp?.name ? `${sp.name} #${i + 1}` : `Pikmin #${i + 1}`,
        x: old?.x ?? rand(20, size.w - 20),
        y: old?.y ?? rand(20, size.h - 20),
        tx: rand(20, size.w - 20),
        ty: rand(20, size.h - 20),
        speed: rand(20, 50),
        anim: "walk",
        flip: false,
        level: 1 + Math.floor(Math.random() * 5),
        nextThinkAt: performance.now() + rand(1500, 5000),
      };
      return a;
    });
    agentsRef.current = next;
    setAgentsTick((t) => t + 1);
  }, [speciesPool, speciesByKey, size.w, size.h]);

  useEffect(() => {
    if (!prefs.show) return;
    let raf = 0;
    let last = performance.now();
    let renderAcc = 0;
    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      renderAcc += dt;

      const speedMul = prefs.speed * (threat ? 1.6 : 1);
      const padX = 16, padY = 16;
      for (const a of agentsRef.current) {
        if (a.anim === "sleep" && now < a.nextThinkAt) continue;

        const dx = a.tx - a.x, dy = a.ty - a.y;
        const dist = Math.hypot(dx, dy);
        const moveStates: PikminAnimation[] = ["walk", "run", "carry"];
        if (moveStates.includes(a.anim) && dist > 2) {
          const v = (a.anim === "run" ? a.speed * 1.6 : a.speed) * speedMul / 1000;
          a.x += (dx / dist) * v * dt;
          a.y += (dy / dist) * v * dt;
          a.flip = dx < 0;
          if (a.x < padX) a.x = padX;
          if (a.x > size.w - padX) a.x = size.w - padX;
          if (a.y < padY) a.y = padY;
          if (a.y > size.h - padY) a.y = size.h - padY;
        } else if (moveStates.includes(a.anim) && dist <= 2) {
          a.anim = Math.random() < 0.4 ? "work" : "idle";
          a.nextThinkAt = now + rand(1500, 3500);
        }

        if (now >= a.nextThinkAt) {
          a.anim = threat ? "run" : randomAnim();
          const target = Math.random() < 0.7 && anchors.length
            ? anchors[Math.floor(Math.random() * anchors.length)]
            : { x: rand(padX, size.w - padX), y: rand(padY, size.h - padY) };
          a.tx = Math.max(padX, Math.min(size.w - padX, target.x + rand(-40, 40)));
          a.ty = Math.max(padY, Math.min(size.h - padY, target.y + rand(-30, 30)));
          a.nextThinkAt = now + rand(2500, 6500);
        }
      }

      if (renderAcc > 80) {
        renderAcc = 0;
        setAgentsTick((t) => (t + 1) % 1_000_000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prefs.show, prefs.speed, threat, anchors, size.w, size.h]);

  const togglePikmin = useCallback(() => setPrefs((p) => ({ ...p, show: !p.show })), []);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden={!prefs.show}>
        {prefs.show && agentsRef.current.map((a) => {
          void agentsTick;
          const sp = speciesByKey.get(a.speciesKey);
          return (
            <AnimatedPikmin
              key={a.id}
              type={a.speciesKey}
              animation={a.anim}
              x={a.x - 18}
              y={a.y - 36}
              size={36}
              flip={a.flip}
              night={prefs.night}
              showShadow
              showDust={a.anim === "run"}
              showBubbles={a.speciesKey === "blue" && (a.anim === "idle" || a.anim === "work")}
              showParticles={a.anim === "celebrate"}
              showZ={a.anim === "sleep"}
              spriteUrls={sp ? {
                idle: sp.sprite_idle_url,
                walk: sp.sprite_walk_url,
                sleep: sp.sprite_sleep_url,
              } : undefined}
              fallbackImageUrl={sp?.image_url ?? sp?.icon_url ?? null}
              tintColor={sp?.color ?? null}
              onClick={() => setSelected({ ...a })}
            />
          );
        })}
        <style>{`[aria-hidden="false"] > div { pointer-events: auto; }`}</style>
      </div>

      {/* Pannello controlli */}
      <div className="panel-strong p-2 flex flex-wrap items-center gap-2 text-[11px]">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={prefs.show} onChange={togglePikmin} className="accent-primary" />
          <span>Mostra Pikmin</span>
        </label>
        <span className="text-muted-foreground">·</span>
        <label className="flex items-center gap-1">
          Qtà
          <input
            type="range" min={3} max={MAX_PIKMIN} value={prefs.count}
            onChange={(e) => setPrefs((p) => ({ ...p, count: Number(e.target.value) }))}
            className="w-20 accent-primary"
          />
          <span className="w-5 text-right">{prefs.count}</span>
        </label>
        <label className="flex items-center gap-1">
          Vel
          <input
            type="range" min={0.5} max={2} step={0.1} value={prefs.speed}
            onChange={(e) => setPrefs((p) => ({ ...p, speed: Number(e.target.value) }))}
            className="w-16 accent-primary"
          />
          <span className="w-7 text-right">{prefs.speed.toFixed(1)}x</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox" checked={prefs.night}
            onChange={(e) => setPrefs((p) => ({ ...p, night: e.target.checked }))}
            className="accent-primary"
          />
          Notte
        </label>
        <span className="text-muted-foreground">·</span>
        {species.length === 0 && (
          <span className="text-muted-foreground italic">Nessuna specie caricata — aggiungila dalla Libreria Sprite</span>
        )}
        {species.map((s) => {
          const on = prefs.filters[s.key] !== false;
          return (
            <button
              key={s.key}
              onClick={() => setPrefs((p) => ({ ...p, filters: { ...p.filters, [s.key]: !on } }))}
              className={`px-2 py-0.5 rounded-full border text-[10px] transition ${
                on
                  ? "bg-primary/20 border-primary/50 text-foreground"
                  : "bg-transparent border-muted-foreground/30 text-muted-foreground opacity-60"
              }`}
              aria-pressed={on}
              title={s.name}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: s.color ?? "#94a3b8" }} />
              {s.name}
            </button>
          );
        })}
        <span className="text-muted-foreground">·</span>
        <button
          onClick={() => setCustomizerOpen(true)}
          className="px-2 py-0.5 rounded-full border border-primary/50 bg-primary/10 text-[10px] hover:bg-primary/20"
          title="Rinomina Pikmin / sprite"
        >
          ✏️ Personalizza
        </button>
      </div>

      <PikminCustomizerModal
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        onSaved={() => { void refreshSpecies(); }}
      />

      {selected && (() => {
        const sp = speciesByKey.get(selected.speciesKey);
        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3"
            onClick={() => setSelected(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="panel-strong p-4 w-full max-w-sm flex flex-col gap-3 animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <div className="panel p-1 flex items-center justify-center" style={{ width: 64, height: 80 }}>
                  {sp?.image_url ? (
                    <img src={sp.image_url} alt={sp.name} className="w-full h-full object-contain" />
                  ) : (
                    <AnimatedPikmin
                      type={selected.speciesKey}
                      animation={selected.anim}
                      size={48}
                      showShadow={false}
                      fallbackImageUrl={sp?.icon_url ?? null}
                      tintColor={sp?.color ?? null}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-display text-base">{selected.name}</p>
                  <p className="text-[11px] text-muted-foreground">{sp?.name ?? selected.speciesKey}</p>
                  <p className="text-[10px] text-primary">Lv {selected.level}</p>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: sp?.color ?? "#94a3b8", color: "#0a0a1a" }}
                >
                  {selected.speciesKey}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="panel p-2">
                  <p className="text-muted-foreground text-[9px] uppercase tracking-widest">Stato</p>
                  <p>{ANIMATION_LABEL[selected.anim]}</p>
                </div>
                <div className="panel p-2">
                  <p className="text-muted-foreground text-[9px] uppercase tracking-widest">Specie</p>
                  <p>{sp?.name ?? selected.speciesKey}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-neon p-2 text-xs">Chiudi</button>
            </div>
          </div>
        );
      })()}
    </>
  );
}
