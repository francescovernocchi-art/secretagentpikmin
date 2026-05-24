/** Dimensioni mondo logiche del villaggio (px). Pan/zoom agisce su queste. */
export const WORLD_W = 1600;
export const WORLD_H = 1000;

/** Tile size logico in px. Mondo = TILE_COLS x TILE_ROWS. */
export const TILE = 50;
export const TILE_COLS = Math.floor(WORLD_W / TILE); // 32
export const TILE_ROWS = Math.floor(WORLD_H / TILE); // 20

/** Edifici hanno position_x/y in 0..100 (percentuali). Converti in coord mondo. */
export function pctToWorld(px: number, py: number): { x: number; y: number } {
  return {
    x: (px / 100) * WORLD_W,
    // y "alto" nel modello (0 basso, 100 alto) → invertita per schermo
    y: WORLD_H - (py / 100) * WORLD_H * 0.85 - WORLD_H * 0.05,
  };
}

export function worldToPct(x: number, y: number): { px: number; py: number } {
  return {
    px: (x / WORLD_W) * 100,
    py: ((WORLD_H - WORLD_H * 0.05 - y) / (WORLD_H * 0.85)) * 100,
  };
}

/** Centro del Campo Base nel mondo (sempre al centro per ora). */
export const BASE_CENTER = { x: WORLD_W / 2, y: WORLD_H / 2 + 40 };
