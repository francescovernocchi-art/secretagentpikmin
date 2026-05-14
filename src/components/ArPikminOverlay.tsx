import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PIKMIN_LIST } from "@/assets/pikmin";
import { supabase } from "@/integrations/supabase/client";
import { grantIngredients } from "@/lib/ingredients";

// Solo immagini senza sfondo (no JPG con sfondo bianco)
const AR_POOL = PIKMIN_LIST.filter((p) => p.transparent);

const FALLBACK_INGREDIENTS = [
  { key: "seed_red", name: "Seme Rosso", emoji: "🔴" },
  { key: "seed_yellow", name: "Seme Giallo", emoji: "🟡" },
  { key: "seed_blue", name: "Seme Blu", emoji: "🔵" },
  { key: "water", name: "Goccia d'acqua", emoji: "💧" },
  { key: "leaf", name: "Foglia magica", emoji: "🍃" },
  { key: "honey", name: "Miele dorato", emoji: "🍯" },
  { key: "mushroom", name: "Fungo strano", emoji: "🍄" },
  { key: "rock_frag", name: "Frammento di roccia", emoji: "🪨" },
  { key: "spark", name: "Scintilla", emoji: "✨" },
  { key: "star_dust", name: "Polvere di stelle", emoji: "🌟" },
];

const OBJECTS = [
  { key: "treasure_box", name: "Cassa del tesoro", emoji: "🎁", xp: 20 },
  { key: "ancient_key", name: "Chiave antica", emoji: "🗝️", xp: 25 },
  { key: "crystal", name: "Cristallo segreto", emoji: "💎", xp: 30 },
  { key: "ufo_relic", name: "Reliquia UFO", emoji: "🛸", xp: 35 },
  { key: "old_map", name: "Mappa consumata", emoji: "🗺️", xp: 15 },
];

const MISSION_HINTS = [
  "Cerca qualcosa di rosso in cucina 🍅",
  "Conta tutte le finestre della casa 🪟",
  "Trova un libro più vecchio di te 📚",
  "Disegna ciò che vedi dalla tua finestra ✏️",
  "Costruisci una torre con 5 oggetti 🗼",
  "Saluta papà con un codice segreto 🤫",
];

type TargetKind = "pikmin" | "ingredient" | "object" | "mission";

type Target = {
  kind: TargetKind;
  src?: string;
  emoji?: string;
  key?: string;
  name: string;
  payload?: string;
  xp?: number;
  alpha: number;
  beta: number;
};

type IngredientRow = { key: string; name: string; emoji: string };

function pickKind(): TargetKind {
  const r = Math.random();
  if (r < 0.45) return "pikmin";
  if (r < 0.8) return "ingredient";
  if (r < 0.95) return "object";
  return "mission";
}

function pickTarget(baselineAlpha: number, ingredientPool: IngredientRow[]): Target {
  const kind = pickKind();
  const offset = (Math.random() * 140 - 70 + 360) % 360;
  const base = {
    alpha: (baselineAlpha + offset) % 360,
    beta: Math.random() * 24 - 12,
  };
  if (kind === "pikmin") {
    const p = AR_POOL[Math.floor(Math.random() * AR_POOL.length)];
    return { kind, src: p.src, name: p.name, ...base };
  }
  if (kind === "ingredient") {
    const pool = ingredientPool.length ? ingredientPool : FALLBACK_INGREDIENTS;
    const p = pool[Math.floor(Math.random() * pool.length)];
    return { kind, key: p.key, name: p.name, emoji: p.emoji, ...base };
  }
  if (kind === "object") {
    const o = OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
    return { kind, key: o.key, name: o.name, emoji: o.emoji, xp: o.xp, ...base };
  }
  const hint = MISSION_HINTS[Math.floor(Math.random() * MISSION_HINTS.length)];
  return { kind, name: "Nuova missione", emoji: "📜", payload: hint, ...base };
}

function deltaDeg(a: number, b: number) {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

// Quanto a lungo un target resta valido prima di poter cambiare
const TARGET_MIN_LIFETIME_MS = 8000;
// Tempo extra durante il quale il target resta bloccato dopo essere stato visto
const TARGET_HOLD_AFTER_SEEN_MS = 5000;

export function ArPikminOverlay() {
  const [target, setTarget] = useState<Target | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; visible: boolean; lock: number }>({
    x: 50,
    y: 50,
    visible: false,
    lock: 0,
  });
  const [needsPermission, setNeedsPermission] = useState(false);
  const [noSensor, setNoSensor] = useState(false);
  const baselineRef = useRef<number | null>(null);
  const gotEventRef = useRef(false);
  // Timestamp di nascita del target corrente
  const targetBornAtRef = useRef<number>(0);
  // Ultima volta in cui il target è stato “visto” (lock alto)
  const lastSeenAtRef = useRef<number>(0);
  // Ultimo evento sensore valido ricevuto
  const lastEventAtRef = useRef<number>(0);
  // Cleanup correntemente attivo
  const detachRef = useRef<(() => void) | null>(null);
  // Watchdog interval id
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [stalled, setStalled] = useState(false);
  // Pool ingredienti caricato dal DB (con fallback statico)
  const ingredientPoolRef = useRef<IngredientRow[]>(FALLBACK_INGREDIENTS);
  const [grantBusy, setGrantBusy] = useState(false);

  const spawnTarget = (baselineAlpha: number) => {
    const t = pickTarget(baselineAlpha, ingredientPoolRef.current);
    targetBornAtRef.current = Date.now();
    lastSeenAtRef.current = 0;
    setTarget(t);
  };

  // Estrae un alpha utilizzabile da un evento, gestendo i quirk iOS.
  const readAlpha = (e: DeviceOrientationEvent): number | null => {
    // iOS Safari: webkitCompassHeading è una bussola "vera" 0-360 (cw).
    // Convertiamo a stile alpha (ccw, 0 = nord) per coerenza con il resto.
    const wk = (e as any).webkitCompassHeading;
    if (typeof wk === "number" && !Number.isNaN(wk)) {
      return (360 - wk) % 360;
    }
    if (e.alpha != null && !Number.isNaN(e.alpha)) return e.alpha;
    return null;
  };

  const attach = () => {
    // Pulisci eventuale listener precedente per evitare doppioni dopo un retry
    detachRef.current?.();

    const handler = (e: DeviceOrientationEvent) => {
      const alpha = readAlpha(e);
      if (alpha == null) return;
      const beta = e.beta != null && !Number.isNaN(e.beta) ? e.beta : 0;

      gotEventRef.current = true;
      lastEventAtRef.current = Date.now();
      if (stalled) setStalled(false);
      if (noSensor) setNoSensor(false);

      if (baselineRef.current == null) {
        baselineRef.current = alpha;
        spawnTarget(alpha);
        return;
      }
      setTarget((t) => {
        if (!t) return t;
        const dA = deltaDeg(alpha, t.alpha); // - = ruotare a destra
        const dB = beta - t.beta;
        // mappa: 25° = bordo schermo
        const x = Math.max(0, Math.min(100, 50 - (dA / 25) * 50));
        const y = Math.max(0, Math.min(100, 50 + (dB / 25) * 50));
        const lock = Math.max(0, 1 - Math.hypot(dA / 25, dB / 25));
        const visible = Math.abs(dA) < 22 && Math.abs(dB) < 22;
        setPos({ x, y, visible, lock });

        const now = Date.now();
        if (lock > 0.55) lastSeenAtRef.current = now;

        const aged = now - targetBornAtRef.current > TARGET_MIN_LIFETIME_MS;
        const cooledDown =
          lastSeenAtRef.current === 0 ||
          now - lastSeenAtRef.current > TARGET_HOLD_AFTER_SEEN_MS;
        const lookingAway = lock < 0.15 && Math.abs(dA) > 60;

        if (aged && cooledDown && lookingAway) {
          const fresh = pickTarget(baselineRef.current ?? alpha, ingredientPoolRef.current);
          targetBornAtRef.current = now;
          lastSeenAtRef.current = 0;
          return fresh;
        }
        return t;
      });
    };

    // iOS preferisce "deviceorientation"; altri device espongono anche la
    // variante assoluta. Ascoltiamo entrambe e deduplichiamo via timestamp.
    window.addEventListener("deviceorientation", handler, true);
    window.addEventListener("deviceorientationabsolute" as any, handler, true);

    const detach = () => {
      window.removeEventListener("deviceorientation", handler, true);
      window.removeEventListener("deviceorientationabsolute" as any, handler, true);
    };
    detachRef.current = detach;
    return detach;
  };

  // Watchdog: se i sensori smettono di emettere (background, lock schermo,
  // permesso revocato su iOS), ri-attacchiamo i listener e riproviamo.
  const startWatchdog = () => {
    watchdogRef.current && clearInterval(watchdogRef.current);
    watchdogRef.current = setInterval(() => {
      if (!gotEventRef.current) return; // gestito dal fallback iniziale
      const silentFor = Date.now() - lastEventAtRef.current;
      if (silentFor > 2500) {
        setStalled(true);
        // riprova: stacca, riattacca, e forza un re-spawn al prossimo evento
        attach();
        // dopo 4s di silenzio totale → fallback senza sensore
        if (silentFor > 4500 && !noSensor) {
          setNoSensor(true);
          if (!target) {
            const p = AR_POOL[Math.floor(Math.random() * AR_POOL.length)];
            setTarget({ kind: "pikmin", src: p.src, name: p.name, alpha: 0, beta: 0 });
          }
          setPos({ x: 30 + Math.random() * 40, y: 30 + Math.random() * 30, visible: true, lock: 1 });
        }
      }
    }, 1200);
  };

  const handleVisibility = () => {
    if (document.visibilityState !== "visible") return;
    // tornando in foreground iOS spesso "perde" l'orientamento: reset baseline
    baselineRef.current = null;
    lastEventAtRef.current = Date.now();
    attach();
  };

  useEffect(() => {
    const anyEvt = (DeviceOrientationEvent as any);
    if (typeof anyEvt?.requestPermission === "function") {
      setNeedsPermission(true);
      return;
    }
    attach();
    startWatchdog();
    document.addEventListener("visibilitychange", handleVisibility);

    const fallbackTimer = setTimeout(() => {
      if (!gotEventRef.current) {
        // Nessun sensore disponibile → fallback statico
        setNoSensor(true);
        const p = AR_POOL[Math.floor(Math.random() * AR_POOL.length)];
        setTarget({ kind: "pikmin", src: p.src, name: p.name, alpha: 0, beta: 0 });
        setPos({ x: 30 + Math.random() * 40, y: 30 + Math.random() * 30, visible: true, lock: 1 });
      }
    }, 1800);

    return () => {
      detachRef.current?.();
      detachRef.current = null;
      watchdogRef.current && clearInterval(watchdogRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(fallbackTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enable = async () => {
    try {
      const res = await (DeviceOrientationEvent as any).requestPermission();
      if (res === "granted") {
        setNeedsPermission(false);
        gotEventRef.current = false;
        lastEventAtRef.current = Date.now();
        attach();
        startWatchdog();
        document.addEventListener("visibilitychange", handleVisibility);
      } else {
        // Permesso negato → modalità fallback
        setNeedsPermission(false);
        setNoSensor(true);
      }
    } catch {
      setNeedsPermission(false);
      setNoSensor(true);
    }
  };

  const recalibrate = () => {
    baselineRef.current = null;
    setStalled(false);
    gotEventRef.current = false;
    lastEventAtRef.current = Date.now();
    attach();
  };


  // Indicatore direzionale (freccia che punta verso il pikmin quando fuori frame)
  const arrow = useMemo(() => {
    if (!target || pos.visible || noSensor) return null;
    // posizione fuori dai bordi → freccia direzionale
    const dx = pos.x - 50;
    const dy = pos.y - 50;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return angle;
  }, [target, pos, noSensor]);

  return (
    <>
      {needsPermission && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <button
            onClick={enable}
            className="btn-neon px-5 py-3 text-sm uppercase tracking-widest"
          >
            Attiva AR
          </button>
        </div>
      )}

      {/* Sensori in stallo → bottone ricalibra */}
      {stalled && !needsPermission && !noSensor && (
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={recalibrate}
            className="text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border border-primary/60 bg-background/40 backdrop-blur text-primary"
          >
            ↻ Ricalibra
          </button>
        </div>
      )}

      {/* Indicatore direzionale (solo quando il bersaglio è lontano) */}
      {arrow != null && pos.lock < 0.5 && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ rotate: arrow }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <div className="h-24 w-1 bg-gradient-to-b from-transparent to-primary rounded-full shadow-[0_0_18px_var(--color-primary)]" />
        </motion.div>
      )}

      {/* Scanner futuristico — appare quando si sta agganciando il bersaglio */}
      {target && !noSensor && pos.lock >= 0.5 && (
        <div
          className="pointer-events-none absolute"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        >
          {(() => {
            const locking = pos.lock >= 0.85;
            const size = 160 - pos.lock * 40; // si stringe man mano che ci avviciniamo
            const ringColor = locking ? "var(--color-primary)" : "oklch(0.86 0.24 145 / 0.7)";
            return (
              <div
                className="relative -translate-x-1/2 -translate-y-1/2"
                style={{ width: size, height: size }}
              >
                {/* anello rotante */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2"
                  style={{
                    borderColor: ringColor,
                    boxShadow: `0 0 24px ${ringColor}, inset 0 0 18px ${ringColor}`,
                    borderStyle: "dashed",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: locking ? 1.2 : 3, repeat: Infinity, ease: "linear" }}
                />
                {/* anello inverso */}
                <motion.div
                  className="absolute inset-[14%] rounded-full border"
                  style={{ borderColor: ringColor, opacity: 0.6 }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: locking ? 0.8 : 2.2, repeat: Infinity, ease: "linear" }}
                />
                {/* parentesi angolari (corner brackets) */}
                {[
                  { top: 0, left: 0, b: "border-t-2 border-l-2", r: "rounded-tl-md" },
                  { top: 0, right: 0, b: "border-t-2 border-r-2", r: "rounded-tr-md" },
                  { bottom: 0, left: 0, b: "border-b-2 border-l-2", r: "rounded-bl-md" },
                  { bottom: 0, right: 0, b: "border-b-2 border-r-2", r: "rounded-br-md" },
                ].map((c, i) => (
                  <motion.span
                    key={i}
                    className={`absolute ${c.b} ${c.r}`}
                    style={{
                      width: 22,
                      height: 22,
                      top: c.top,
                      left: c.left,
                      right: c.right,
                      bottom: c.bottom,
                      borderColor: ringColor,
                      filter: `drop-shadow(0 0 6px ${ringColor})`,
                    }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: locking ? 0.5 : 1, repeat: Infinity, delay: i * 0.08 }}
                  />
                ))}
                {/* linea di scansione orizzontale */}
                <motion.div
                  className="absolute left-[8%] right-[8%] h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${ringColor}, transparent)`,
                    boxShadow: `0 0 8px ${ringColor}`,
                  }}
                  animate={{ top: ["12%", "88%", "12%"] }}
                  transition={{ duration: locking ? 0.9 : 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* crosshair centrale */}
                <span
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: ringColor,
                    boxShadow: `0 0 10px ${ringColor}`,
                  }}
                />
                {/* etichetta stato */}
                <p
                  className="absolute left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.3em] whitespace-nowrap"
                  style={{
                    bottom: -18,
                    color: ringColor,
                    textShadow: `0 0 6px ${ringColor}`,
                  }}
                >
                  {locking ? "● Lock acquisito" : "Scansione…"}
                </p>
              </div>
            );
          })()}
        </div>
      )}


      {/* Pikmin AR — visibile solo quando inquadri la posizione esatta */}
      <AnimatePresence>
        {target && pos.visible && (
          <motion.div
            key={target.src}
            className="pointer-events-none absolute"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <motion.img
              src={target.src}
              alt={target.name}
              className="w-32 h-32 object-contain drop-shadow-[0_0_22px_var(--color-primary)] -translate-x-1/2 -translate-y-1/2"
              animate={{ y: [-4, 4, -4], rotate: [-3, 3, -3] }}
              transition={{
                y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              }}
            />
            <p className="absolute left-1/2 -translate-x-1/2 -bottom-2 text-[10px] uppercase tracking-[0.3em] text-primary text-glow whitespace-nowrap">
              {target.name}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD lock */}
      {target && !noSensor && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-primary/80">
          Lock {(pos.lock * 100).toFixed(0)}%
        </div>
      )}
    </>
  );
}
