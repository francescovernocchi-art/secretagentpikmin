/** Dimensioni mondo logiche del villaggio (px). Pan/zoom agisce su queste. */
export const WORLD_W = 2400;
export const WORLD_H = 1600;

/** Tile size logico in px. Mondo = TILE_COLS x TILE_ROWS. */
export const TILE = 50;
export const TILE_COLS = Math.floor(WORLD_W / TILE);
export const TILE_ROWS = Math.floor(WORLD_H / TILE);

/** Edifici hanno position_x/y in 0..100 (percentuali). Converti in coord mondo,
 *  clampando dentro la "zona costruibile" centrale per evitare di finire sui bordi sfumati. */
const BUILD_INSET_X = 0.18; // 18% per lato → costruzione resta nel centro
const BUILD_INSET_Y = 0.15;

export function pctToWorld(px: number, py: number): { x: number; y: number } {
  const usableW = WORLD_W * (1 - BUILD_INSET_X * 2);
  const usableH = WORLD_H * (1 - BUILD_INSET_Y * 2);
  const offX = WORLD_W * BUILD_INSET_X;
  const offY = WORLD_H * BUILD_INSET_Y;
  return {
    x: offX + (px / 100) * usableW,
    // y "alto" nel modello (0 basso, 100 alto) → invertita per schermo
    y: offY + usableH - (py / 100) * usableH,
  };
}

export function worldToPct(x: number, y: number): { px: number; py: number } {
  const usableW = WORLD_W * (1 - BUILD_INSET_X * 2);
  const usableH = WORLD_H * (1 - BUILD_INSET_Y * 2);
  const offX = WORLD_W * BUILD_INSET_X;
  const offY = WORLD_H * BUILD_INSET_Y;
  return {
    px: ((x - offX) / usableW) * 100,
    py: ((offY + usableH - y) / usableH) * 100,
  };
}

/** Centro del Campo Base nel mondo. */
export const BASE_CENTER = { x: WORLD_W / 2, y: WORLD_H / 2 + 40 };
