import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatedPikmin } from "./AnimatedPikmin";
import { usePikminSpecies, type PikminSpeciesRow } from "@/hooks/usePikminSpecies";
import {
  type PikminAnimation,
} from "@/data/pikminSprites";
import type { BaseBuilding } from "@/lib/base";

export const MAX_PIKMIN = 30;
const LS_KEY = "village.pikminLayer.v3";

export interface PikminLayerPrefs {
  show: boolean;
  maxCap: number;
  speed: number;
  filters: Record<string, boolean>;
  night: boolean;
}

export const DEFAULT_PIKMIN_PREFS: PikminLayerPrefs = {
  show: true,
  maxCap: MAX_PIKMIN,
  speed: 1,
  filters: {},
  night: false,
};

export function loadPikminPrefs(): PikminLayerPrefs {
  if (typeof window === "undefined") return DEFAULT_PIKMIN_PREFS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_PIKMIN_PREFS;
    const p = JSON.parse(raw);
    return { ...DEFAULT_PIKMIN_PREFS, ...p, filters: { ...(p.filters ?? {}) } };
  } catch { return DEFAULT_PIKMIN_PREFS; }
}

export function savePikminPrefs(p: PikminLayerPrefs) {
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
  breakdown?: Record<string, number>;
  /** Preferenze controllate dall'esterno (Estetica panel). Se assenti usa localStorage. */
  prefs?: PikminLayerPrefs;
  onPrefsChange?: (p: PikminLayerPrefs) => void;
  onSelect?: (a: { name: string; speciesKey: string; level: number; anim: PikminAnimation }) => void;
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

/** Layer Pikmin del villaggio — solo render. Toolbar/filtri vivono nel pannello Estetica. */
export function VillagePikminLayer({ buildings, pikminCount, threat, breakdown, prefs: prefsProp, onSelect }: Props) {
  const [internalPrefs, setInternalPrefs] = useState<PikminLayerPrefs>(() => loadPikminPrefs());
  const prefs = prefsProp ?? internalPrefs;
  const { species } = usePikminSpecies();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 600, h: 360 });

  useEffect(() => { if (!prefsProp) savePikminPrefs(internalPrefs); }, [internalPrefs, prefsProp]);

  // Inizializza filtri default su DB
  useEffect(() => {
    if (!species.length || prefsProp) return;
    setInternalPrefs((p) => {
      const next = { ...p.filters };
      let changed = false;
      for (const s of species) if (next[s.key] === undefined) { next[s.key] = true; changed = true; }
      return changed ? { ...p, filters: next } : p;
    });
  }, [species, prefsProp]);

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

  const speciesPool = useMemo<string[]>(() => {
    const owned = species
      .filter((s) => prefs.filters[s.key] !== false)
      .map((s) => ({ key: s.key, n: Math.max(0, Math.floor(breakdown?.[s.key] ?? 0)) }))
      .filter((e) => e.n > 0);
    const total = owned.reduce((a, e) => a + e.n, 0);
    if (total === 0) return [];
    const cap = Math.max(1, Math.min(MAX_PIKMIN, prefs.maxCap));
    const pool: string[] = [];
    if (total <= cap) {
      for (const e of owned) for (let i = 0; i < e.n; i++) pool.push(e.key);
    } else {
      const scaled = owned.map((e) => ({ key: e.key, n: Math.max(1, Math.round((e.n / total) * cap)) }));
      let sum = scaled.reduce((a, e) => a + e.n, 0);
      while (sum > cap) {
        const idx = scaled.reduce((mi, e, i, arr) => (e.n > arr[mi].n ? i : mi), 0);
        scaled[idx].n--; sum--;
      }
      while (sum < cap) {
        const idx = scaled.reduce((mi, e, i, arr) => (e.n < arr[mi].n ? i : mi), 0);
        scaled[idx].n++; sum++;
      }
      for (const e of scaled) for (let i = 0; i < e.n; i++) pool.push(e.key);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }, [species, breakdown, prefs.filters, prefs.maxCap]);

  void pikminCount;

  const agentsRef = useRef<Agent[]>([]);
  const [agentsTick, setAgentsTick] = useState(0);

  useEffect(() => {
    const next: Agent[] = speciesPool.map((key, i) => {
      const old = agentsRef.current[i];
      const sp = speciesByKey.get(key);
      return {
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

  const handleClick = useCallback((a: Agent) => {
    onSelect?.({ name: a.name, speciesKey: a.speciesKey, level: a.level, anim: a.anim });
  }, [onSelect]);

  return (
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
            onClick={() => handleClick(a)}
          />
        );
      })}
      <style>{`[aria-hidden="false"] > div { pointer-events: auto; }`}</style>
    </div>
  );
}
