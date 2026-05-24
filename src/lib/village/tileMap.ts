import { TILE_COLS, TILE_ROWS } from "./mapProjection";
import type { BiomeKey } from "./biomes";

export type TileKind =
  | "grass" | "dirt" | "sand" | "rock" | "snow" | "lava" | "metal" | "water" | "moss" | "ash";

/** Palette tile per bioma. */
export const TILE_PALETTE: Record<TileKind, { fill: string; stroke: string }> = {
  grass: { fill: "#6db66a", stroke: "#5aa058" },
  moss:  { fill: "#4f8a4d", stroke: "#3f7240" },
  dirt:  { fill: "#a07a4b", stroke: "#8a6840" },
  sand:  { fill: "#e8d291", stroke: "#cdb878" },
  rock:  { fill: "#9a958a", stroke: "#7c7770" },
  snow:  { fill: "#e9f1f7", stroke: "#c8d6e0" },
  lava:  { fill: "#c0442a", stroke: "#8a2a16" },
  metal: { fill: "#8d8d96", stroke: "#6a6a72" },
  water: { fill: "#5fa9d6", stroke: "#3f86b3" },
  ash:   { fill: "#3a3540", stroke: "#2a2630" },
};

interface BiomeTiles {
  base: TileKind;
  accent: TileKind;
  rare: TileKind;
  accentChance: number;
  rareChance: number;
}

export const BIOME_TILES: Record<BiomeKey, BiomeTiles> = {
  foresta:     { base: "grass", accent: "moss",  rare: "dirt",  accentChance: 0.28, rareChance: 0.05 },
  roccioso:    { base: "rock",  accent: "dirt",  rare: "moss",  accentChance: 0.30, rareChance: 0.06 },
  litorale:    { base: "sand",  accent: "grass", rare: "water", accentChance: 0.20, rareChance: 0.10 },
  montanaro:   { base: "snow",  accent: "rock",  rare: "dirt",  accentChance: 0.25, rareChance: 0.05 },
  vulcanico:   { base: "ash",   accent: "rock",  rare: "lava",  accentChance: 0.25, rareChance: 0.08 },
  industriale: { base: "metal", accent: "rock",  rare: "dirt",  accentChance: 0.30, rareChance: 0.05 },
  spaziale:    { base: "metal", accent: "ash",   rare: "rock",  accentChance: 0.25, rareChance: 0.07 },
  desertico:   { base: "sand",  accent: "dirt",  rare: "rock",  accentChance: 0.25, rareChance: 0.05 },
};

/** PRNG deterministico (mulberry32). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface TileCell { kind: TileKind; col: number; row: number }

/** Genera la griglia di tile per agente+bioma (deterministica). */
export function generateTiles(seed: string, biome: BiomeKey): TileCell[] {
  const cfg = BIOME_TILES[biome] ?? BIOME_TILES.foresta;
  const rnd = mulberry32(hashSeed(`${seed}|${biome}`));
  const out: TileCell[] = [];
  for (let r = 0; r < TILE_ROWS; r++) {
    for (let c = 0; c < TILE_COLS; c++) {
      const v = rnd();
      let kind: TileKind = cfg.base;
      if (v < cfg.rareChance) kind = cfg.rare;
      else if (v < cfg.rareChance + cfg.accentChance) kind = cfg.accent;
      out.push({ kind, col: c, row: r });
    }
  }
  return out;
}
