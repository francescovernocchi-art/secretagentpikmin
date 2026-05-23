/**
 * Configurazione MANUALE sprite sheet Pikmin.
 *
 * Sheet sorgente: src/assets/pikmin-sprites.png
 * Contiene intestazioni decorative — usiamo offset fissi, NESSUN auto-detect.
 *
 * Grid:
 *   frameWidth  = 128
 *   frameHeight = 128
 *   startOffsetX = 100
 *   startOffsetY = 60
 *   gapX = 8
 *   gapY = 8
 *
 * Righe (colore): 0 rosso, 1 blu, 2 giallo, 3 viola, 4 bianco.
 * Colonne (azioni):
 *   0-2  idle
 *   3-6  walk
 *   7-9  run
 *   10-11 carry
 *   12-13 work
 *   14    sleep
 *   15    celebrate
 *
 * Uso privato/familiare.
 */

export const FRAME_W = 128;
export const FRAME_H = 128;
export const START_X = 100;
export const START_Y = 60;
export const GAP_X = 8;
export const GAP_Y = 8;
export const STRIDE_X = FRAME_W + GAP_X; // 136
export const STRIDE_Y = FRAME_H + GAP_Y; // 136

export type PikminType = "red" | "blue" | "yellow" | "purple" | "white";
export type PikminAnimation =
  | "idle"
  | "walk"
  | "run"
  | "carry"
  | "work"
  | "sleep"
  | "celebrate";

interface AnimDef {
  /** Colonna iniziale (0-based). */
  startCol: number;
  /** Numero di frame. */
  frames: number;
  /** Durata totale del loop in ms. */
  durationMs: number;
  loop: boolean;
}

export const ANIMATIONS: Record<PikminAnimation, AnimDef> = {
  idle:      { startCol: 0,  frames: 3, durationMs: 900,  loop: true },
  walk:      { startCol: 3,  frames: 4, durationMs: 600,  loop: true },
  run:       { startCol: 7,  frames: 3, durationMs: 360,  loop: true },
  carry:     { startCol: 10, frames: 2, durationMs: 600,  loop: true },
  work:      { startCol: 12, frames: 2, durationMs: 480,  loop: true },
  sleep:     { startCol: 14, frames: 1, durationMs: 2400, loop: true },
  celebrate: { startCol: 15, frames: 1, durationMs: 500,  loop: true },
};

export const PIKMIN_ROW: Record<PikminType, number> = {
  red: 0, blue: 1, yellow: 2, purple: 3, white: 4,
};

export const PIKMIN_LABEL: Record<PikminType, string> = {
  red: "Pikmin Rosso",
  blue: "Pikmin Blu",
  yellow: "Pikmin Giallo",
  purple: "Pikmin Viola",
  white: "Pikmin Bianco",
};

export const PIKMIN_COLOR_DOT: Record<PikminType, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#facc15",
  purple: "#a855f7",
  white: "#f8fafc",
};

export const ANIMATION_LABEL: Record<PikminAnimation, string> = {
  idle: "In attesa",
  walk: "In cammino",
  run: "In corsa",
  carry: "Trasporta",
  work: "Al lavoro",
  sleep: "Dorme",
  celebrate: "Festeggia",
};

/** Coordinate (px) del primo frame di un'azione nello sheet sorgente. */
export function frameOffset(type: PikminType, anim: PikminAnimation, frameIdx = 0): { x: number; y: number } {
  const row = PIKMIN_ROW[type];
  const def = ANIMATIONS[anim];
  const col = def.startCol + Math.max(0, Math.min(def.frames - 1, frameIdx));
  return {
    x: -(START_X + col * STRIDE_X),
    y: -(START_Y + row * STRIDE_Y),
  };
}

export const MISSION_HINTS: Record<PikminType, string[]> = {
  red:    ["Difesa perimetro", "Cacciatore frutti", "Pattuglia"],
  blue:   ["Esplora pozze", "Trasporto risorse", "Pulizia base"],
  yellow: ["Cablaggio Reattore", "Vedetta alta", "Trasporto pietre"],
  purple: ["Carico pesante", "Demolizione", "Guardia notturna"],
  white:  ["Scouting veloce", "Esplorazione", "Ronda silenziosa"],
};

export const TYPE_NAMES: Record<PikminType, string[]> = {
  red:    ["Brace", "Cinabro", "Vampa", "Tito", "Rubino"],
  blue:   ["Onda", "Lago", "Nilo", "Lapis", "Sirio"],
  yellow: ["Sole", "Ambra", "Ciro", "Luce", "Mirto"],
  purple: ["Iris", "Ombra", "Murex", "Plum", "Viola"],
  white:  ["Neve", "Polvere", "Eco", "Lillo", "Bianca"],
};
