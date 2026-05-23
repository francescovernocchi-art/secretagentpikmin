import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import sprites from "@/assets/pikmin-sprites.png";
import type { BaseBuilding } from "@/lib/base";

/**
 * Mini-Pikmin animati per la pagina Villaggio.
 * Usa uno sprite sheet 6 colonne × 5 righe.
 * Righe: 0 rosso, 1 blu, 2 giallo, 3 viola, 4 bianco.
 * Colonne (stati): 0 idle, 1 walk, 2 run, 3 carry, 4 work/celebrate, 5 sleep.
 *
 * Uso solo privato/familiare, non destinato a pubblicazione commerciale.
 */

const SHEET_COLS = 6;
const SHEET_ROWS = 5;

export type PikminColor = "rosso" | "blu" | "giallo" | "viola" | "bianco";
export type PikminState = "idle" | "walk" | "run" | "carry" | "work" | "sleep" | "celebrate";

const COLOR_ROW: Record<PikminColor, number> = {
  rosso: 0,
  blu: 1,
  giallo: 2,
  viola: 3,
  bianco: 4,
};

const STATE_COL: Record<PikminState, number> = {
  idle: 0,
  walk: 1,
  run: 2,
  carry: 3,
  work: 4,
  celebrate: 4,
  sleep: 5,
};

const COLOR_LABEL: Record<PikminColor, string> = {
  rosso: "Pikmin Rosso",
  blu: "Pikmin Blu",
  giallo: "Pikmin Giallo",
  viola: "Pikmin Viola",
  bianco: "Pikmin Bianco",
};

const STATE_LABEL: Record<PikminState, string> = {
  idle: "In attesa",
  walk: "In cammino",
  run: "In corsa",
  carry: "Trasporta oggetti",
  work: "Lavora alla costruzione",
  celebrate: "Festeggia",
  sleep: "Dorme",
};

const COLOR_MISSION: Record<PikminColor, string[]> = {
  rosso: ["Pattuglia perimetro", "Difesa Torre", "Cacciatore frutti"],
  blu: ["Esplora pozze", "Trasporto risorse acquatiche", "Pulizia base"],
  giallo: ["Cablaggio Reattore", "Trasporto pietre", "Vedetta alta"],
  viola: ["Demolizione", "Carico pesante", "Guardia notturna"],
  bianco: ["Esplorazione veloce", "Scouting pezzi navicella", "Ronda silenziosa"],
};

interface Mini {
  id: number;
  color: PikminColor;
  x: number; // percent
  y: number; // percent (bottom)
  targetX: number;
  targetY: number;
  state: PikminState;
  flip: boolean;
  speed: number;
  name: string;
  nextThinkAt: number;
}

const NAMES = [
  "Pippo", "Lalla", "Mirto", "Nino", "Zaira", "Otto", "Bea", "Tito",
  "Lola", "Remi", "Ciro", "Sole", "Vela", "Igor", "Nora", "Dino",
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomState(): PikminState {
  const r = Math.random();
  if (r < 0.18) return "idle";
  if (r < 0.55) return "walk";
  if (r < 0.7) return "run";
  if (r < 0.82) return "carry";
  if (r < 0.92) return "work";
  if (r < 0.97) return "celebrate";
  return "sleep";
}

function createMini(id: number, color: PikminColor, anchors: { x: number; y: number }[]): Mini {
  const anchor = anchors.length ? anchors[Math.floor(Math.random() * anchors.length)] : { x: rand(15, 85), y: rand(10, 60) };
  return {
    id,
    color,
    x: rand(15, 85),
    y: rand(10, 55),
    targetX: anchor.x + rand(-8, 8),
    targetY: anchor.y + rand(-6, 6),
    state: "walk",
    flip: Math.random() < 0.5,
    speed: rand(0.25, 0.7),
    name: NAMES[id % NAMES.length],
    nextThinkAt: Date.now() + rand(2000, 6000),
  };
}

const ALL_COLORS: PikminColor[] = ["rosso", "blu", "giallo", "viola", "bianco"];

interface Props {
  /** Edifici reali del villaggio: i Pikmin gravitano vicino a loro. */
  buildings: BaseBuilding[];
  /** Conteggio Pikmin reale (per scalare la popolazione visibile). */
  pikminCount: number;
  /** Stato minacce per cambiare comportamento (alerta = corsa). */
  threat?: boolean;
  /** Suddivisione opzionale per tipo (key→count); se assente, distribuzione uniforme. */
  breakdown?: Partial<Record<PikminColor, number>>;
}

/** Componente principale: mostra mini Pikmin animati sopra il canvas del villaggio. */
export function VillagePikminAnimations({ buildings, pikminCount, threat, breakdown }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [filters, setFilters] = useState<Record<PikminColor, boolean>>({
    rosso: true, blu: true, giallo: true, viola: true, bianco: true,
  });
  const [selected, setSelected] = useState<Mini | null>(null);
  const [tick, setTick] = useState(0);

  // anchors = posizioni degli edifici (per gravitare attorno alle costruzioni)
  const anchors = useMemo(
    () => buildings.map((b) => ({ x: b.position_x, y: b.position_y * 0.55 })),
    [buildings],
  );

  // popolazione visiva: 1 mini ogni 3 pikmin reali, min 5, max 18
  const population = useMemo(() => {
    if (!pikminCount) return 6;
    return Math.max(5, Math.min(18, Math.ceil(pikminCount / 3)));
  }, [pikminCount]);

  // distribuzione colori in base al breakdown reale o uniforme
  const colorPool = useMemo<PikminColor[]>(() => {
    const pool: PikminColor[] = [];
    const totalKnown = ALL_COLORS.reduce((a, c) => a + (breakdown?.[c] ?? 0), 0);
    if (totalKnown > 0) {
      for (const c of ALL_COLORS) {
        const n = Math.max(0, Math.round(((breakdown?.[c] ?? 0) / totalKnown) * population));
        for (let i = 0; i < n; i++) pool.push(c);
      }
    }
    while (pool.length < population) pool.push(ALL_COLORS[pool.length % ALL_COLORS.length]);
    return pool.slice(0, population);
  }, [breakdown, population]);

  const minisRef = useRef<Mini[]>([]);
  const [minis, setMinis] = useState<Mini[]>([]);

  // inizializza la popolazione quando cambia
  useEffect(() => {
    minisRef.current = colorPool.map((c, i) => createMini(i, c, anchors));
    setMinis(minisRef.current);
  }, [colorPool, anchors]);

  // game loop ~10fps: muove i pikmin verso target e cambia stato
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const now = Date.now();
      const next = minisRef.current.map((m) => {
        let { x, y, targetX, targetY, state, flip, speed, nextThinkAt } = m;

        // se sta dormendo, non si muove
        if (state === "sleep" && now < nextThinkAt) {
          return { ...m };
        }

        // muoviti verso target
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.hypot(dx, dy);
        const effSpeed = (threat ? speed * 2 : speed) * (state === "run" ? 1.6 : state === "walk" || state === "carry" ? 1 : 0);

        if (dist > 0.5 && effSpeed > 0) {
          x += (dx / dist) * effSpeed;
          y += (dy / dist) * effSpeed;
          flip = dx < 0;
        } else if (dist <= 0.5 && (state === "walk" || state === "run" || state === "carry")) {
          // arrivato: vai in idle/work
          state = Math.random() < 0.4 ? "work" : "idle";
          nextThinkAt = now + rand(1500, 4000);
        }

        // riconsidera comportamento
        if (now >= nextThinkAt) {
          const newState = threat ? "run" : randomState();
          state = newState;
          const anchor = anchors.length && Math.random() < 0.75
            ? anchors[Math.floor(Math.random() * anchors.length)]
            : { x: rand(15, 85), y: rand(10, 55) };
          targetX = anchor.x + rand(-8, 8);
          targetY = anchor.y + rand(-6, 6);
          nextThinkAt = now + rand(2500, 6500);
        }

        return { ...m, x, y, targetX, targetY, state, flip, nextThinkAt };
      });
      minisRef.current = next;
      setMinis(next);
      setTick((t) => t + 1);
    }, 100);
    return () => clearInterval(id);
  }, [enabled, anchors, threat]);

  const visible = minis.filter((m) => filters[m.color]);

  return (
    <>
      {/* layer animato sopra il canvas: pointer-events ai singoli pikmin */}
      {enabled && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {visible.map((m) => (
            <MiniPikminSprite
              key={m.id}
              mini={m}
              onClick={() => setSelected(m)}
            />
          ))}
        </div>
      )}

      {/* Controlli: toggle + filtri colore */}
      <div className="panel-strong p-2 flex flex-wrap items-center gap-2 text-[11px]">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-primary"
          />
          <span>Mostra Pikmin animati</span>
        </label>
        <span className="text-muted-foreground ml-1">·</span>
        {ALL_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setFilters((f) => ({ ...f, [c]: !f[c] }))}
            disabled={!enabled}
            className={`px-2 py-0.5 rounded-full border text-[10px] transition ${
              filters[c]
                ? "bg-primary/20 border-primary/50 text-foreground"
                : "bg-transparent border-muted-foreground/30 text-muted-foreground opacity-60"
            } disabled:opacity-30`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
              style={{ background: colorDot(c) }}
            />
            {c}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">{visible.length} attivi</span>
      </div>

      {/* Dettaglio Pikmin selezionato */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="panel-strong p-4 w-full max-w-sm flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 panel flex items-center justify-center overflow-hidden">
                  <PikminFrame color={selected.color} state={selected.state} size={56} flip={false} />
                </div>
                <div className="flex-1">
                  <p className="font-display text-base">{selected.name}</p>
                  <p className="text-[11px] text-muted-foreground">{COLOR_LABEL[selected.color]}</p>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: colorDot(selected.color), color: "#0a0a1a" }}
                >
                  {selected.color}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="panel p-2">
                  <p className="text-muted-foreground text-[9px] uppercase tracking-widest">Stato</p>
                  <p>{STATE_LABEL[selected.state]}</p>
                </div>
                <div className="panel p-2">
                  <p className="text-muted-foreground text-[9px] uppercase tracking-widest">Missione</p>
                  <p>{missionFor(selected)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="btn-neon p-2 text-xs"
              >
                Chiudi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function missionFor(m: Mini): string {
  const pool = COLOR_MISSION[m.color];
  return pool[m.id % pool.length];
}

function colorDot(c: PikminColor): string {
  switch (c) {
    case "rosso": return "#ef4444";
    case "blu": return "#3b82f6";
    case "giallo": return "#facc15";
    case "viola": return "#a855f7";
    case "bianco": return "#f8fafc";
  }
}

/** Singolo sprite Pikmin posizionato e animato. */
function MiniPikminSprite({ mini, onClick }: { mini: Mini; onClick: () => void }) {
  const size = 36;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="absolute pointer-events-auto -translate-x-1/2 group"
      style={{
        left: `${mini.x}%`,
        bottom: `${mini.y}%`,
        width: size,
        height: size,
        filter: "drop-shadow(0 2px 3px rgba(0,0,0,.6))",
      }}
      animate={
        mini.state === "sleep"
          ? { y: [0, 0, 0] }
          : mini.state === "celebrate"
            ? { y: [0, -6, 0], rotate: [-4, 4, -4] }
            : mini.state === "work"
              ? { rotate: [-6, 6, -6] }
              : mini.state === "run"
                ? { y: [0, -3, 0] }
                : { y: [0, -1.5, 0] }
      }
      transition={{
        duration: mini.state === "run" ? 0.25 : mini.state === "celebrate" ? 0.5 : 0.7,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      aria-label={`${COLOR_LABEL[mini.color]} - ${STATE_LABEL[mini.state]}`}
    >
      <PikminFrame color={mini.color} state={mini.state} size={size} flip={mini.flip} />
      {mini.state === "sleep" && (
        <span className="absolute -top-2 -right-1 text-[10px]">💤</span>
      )}
      {mini.state === "celebrate" && (
        <span className="absolute -top-2 -right-1 text-[10px]">✨</span>
      )}
      <span className="absolute left-1/2 -translate-x-1/2 -bottom-3 opacity-0 group-hover:opacity-100 transition text-[8px] bg-black/70 px-1 rounded whitespace-nowrap">
        {mini.name}
      </span>
    </motion.button>
  );
}

/** Renderizza il frame corretto dello sprite sheet via background-position. */
function PikminFrame({
  color, state, size, flip,
}: { color: PikminColor; state: PikminState; size: number; flip: boolean }) {
  const row = COLOR_ROW[color];
  const col = STATE_COL[state];
  return (
    <span
      style={{
        display: "block",
        width: size,
        height: size,
        backgroundImage: `url(${sprites})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${SHEET_COLS * 100}% ${SHEET_ROWS * 100}%`,
        backgroundPosition: `${(col / (SHEET_COLS - 1)) * 100}% ${(row / (SHEET_ROWS - 1)) * 100}%`,
        transform: flip ? "scaleX(-1)" : undefined,
        imageRendering: "auto",
      }}
    />
  );
}
