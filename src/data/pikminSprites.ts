/**
 * Configurazione sprite sheet Pikmin.
 *
 * Sheet uniforme: 7 colonne × 5 righe.
 * Colonne (azioni): 0 idle, 1 walk, 2 run, 3 carry, 4 work, 5 sleep, 6 celebrate.
 * Righe (colori):  0 rosso, 1 blu, 2 giallo, 3 viola, 4 bianco.
 *
 * Frame size: 128 × 190 (sheet 896 × 950).
 *
 * Uso privato/familiare — non destinato a pubblicazione commerciale.
 */

export const SPRITE_COLS = 7;
export const SPRITE_ROWS = 5;
export const FRAME_W = 128;
export const FRAME_H = 190;

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
  /** Colonna iniziale nella sheet. */
  startCol: number;
  /** Numero di frame (>=1). Il sheet attuale ha 1 frame rappresentativo per azione. */
  frames: number;
  /** Durata totale del loop in ms. */
  durationMs: number;
  /** Loop indefinito. */
  loop: boolean;
}

export const ANIMATIONS: Record<PikminAnimation, AnimDef> = {
  idle:      { startCol: 0, frames: 1, durationMs: 1200, loop: true },
  walk:      { startCol: 1, frames: 1, durationMs: 600,  loop: true },
  run:       { startCol: 2, frames: 1, durationMs: 380,  loop: true },
  carry:     { startCol: 3, frames: 1, durationMs: 700,  loop: true },
  work:      { startCol: 4, frames: 1, durationMs: 500,  loop: true },
  sleep:     { startCol: 5, frames: 1, durationMs: 2400, loop: true },
  celebrate: { startCol: 6, frames: 1, durationMs: 500,  loop: true },
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

/** Restituisce le coordinate (x, y) in px del frame nella sheet. */
export function frameOffset(type: PikminType, anim: PikminAnimation, frameIdx = 0): { x: number; y: number } {
  const row = PIKMIN_ROW[type];
  const def = ANIMATIONS[anim];
  const col = def.startCol + Math.max(0, Math.min(def.frames - 1, frameIdx));
  return { x: -col * FRAME_W, y: -row * FRAME_H };
}

/** Suggerimenti missione per tipo. */
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
