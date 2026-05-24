import type { BaseBuilding } from "@/lib/base";
import type { BiomeKey } from "@/lib/village/biomes";
import type { PikminSpeciesRow } from "@/hooks/usePikminSpecies";

export const WORLD_W = 2400;
export const WORLD_H = 1600;

/** Inset costruibile in percentuale (deve combaciare con mapProjection). */
export const BUILD_INSET_X = 0.18;
export const BUILD_INSET_Y = 0.15;

export interface PlacementInfo {
  /** chiave catalogo */
  key: string;
  /** url immagine eventuale */
  imageUrl?: string | null;
  /** emoji fallback */
  emoji: string;
  /** size logica (vw nel vecchio modello) */
  size?: number;
}

export interface VillageGameState {
  biome: BiomeKey;
  seed: string;
  buildings: BaseBuilding[];
  /** per ogni edificio: url immagine per il livello attuale (o null). */
  buildingImageByType: Record<string, string | null>;
  /** per ogni edificio: emoji fallback. */
  buildingEmojiByType: Record<string, string>;
  /** specie pikmin possedute (con quantità per la distribuzione visiva). */
  pikminBreakdown: Record<string, number>;
  pikminSpecies: PikminSpeciesRow[];
  /** cap visivo */
  pikminMaxVisible: number;
  /** mode posizionamento attivo. */
  placement: PlacementInfo | null;
}

export interface VillageGameEvents {
  selectBuilding: (id: string) => void;
  placePosition: (pct: { x: number; y: number }) => void;
  tapGround: () => void;
}

/** Converti pct (0..100) → coordinate mondo Phaser. */
export function pctToWorld(px: number, py: number) {
  const usableW = WORLD_W * (1 - BUILD_INSET_X * 2);
  const usableH = WORLD_H * (1 - BUILD_INSET_Y * 2);
  const offX = WORLD_W * BUILD_INSET_X;
  const offY = WORLD_H * BUILD_INSET_Y;
  return {
    x: offX + (px / 100) * usableW,
    y: offY + usableH - (py / 100) * usableH,
  };
}

export function worldToPct(x: number, y: number) {
  const usableW = WORLD_W * (1 - BUILD_INSET_X * 2);
  const usableH = WORLD_H * (1 - BUILD_INSET_Y * 2);
  const offX = WORLD_W * BUILD_INSET_X;
  const offY = WORLD_H * BUILD_INSET_Y;
  return {
    x: ((x - offX) / usableW) * 100,
    y: ((offY + usableH - y) / usableH) * 100,
  };
}

export function isInBuildableArea(x: number, y: number) {
  const minX = WORLD_W * BUILD_INSET_X;
  const maxX = WORLD_W * (1 - BUILD_INSET_X);
  const minY = WORLD_H * BUILD_INSET_Y;
  const maxY = WORLD_H * (1 - BUILD_INSET_Y);
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

/** Palette bioma → colori terreno/decor. */
export const BIOME_COLORS: Record<BiomeKey, { ground: number; grass: number; flower: number; rock: number; fog: number }> = {
  foresta:     { ground: 0x3d6b4d, grass: 0x5b9b6e, flower: 0xffd166, rock: 0x6e6862, fog: 0x0d1f15 },
  roccioso:    { ground: 0x7a716b, grass: 0x9a8d80, flower: 0xc9a84c, rock: 0x4a423d, fog: 0x1a1612 },
  litorale:    { ground: 0x6ca8c4, grass: 0xe6d39a, flower: 0xffb4a2, rock: 0x6b6664, fog: 0x0b2030 },
  montanaro:   { ground: 0x9aa7b2, grass: 0xdbe3ea, flower: 0xc8b6ff, rock: 0x5c6470, fog: 0x101820 },
  vulcanico:   { ground: 0x5a2a1a, grass: 0xa84a2a, flower: 0xfb923c, rock: 0x2a1410, fog: 0x180806 },
  industriale: { ground: 0x5a5560, grass: 0x7c7686, flower: 0xc084fc, rock: 0x2c2730, fog: 0x100a16 },
  spaziale:    { ground: 0x1a1f3a, grass: 0x2e3560, flower: 0x67e8f9, rock: 0x0a0c1a, fog: 0x05060f },
  desertico:   { ground: 0xc9974a, grass: 0xdcb066, flower: 0xff8c42, rock: 0x8a5a2a, fog: 0x2a1c08 },
};
