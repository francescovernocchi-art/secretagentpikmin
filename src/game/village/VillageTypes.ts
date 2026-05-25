import type { BaseBuilding } from "@/lib/base";
import type { BiomeKey } from "@/lib/village/biomes";
import type { DioramaRow, DioramaSlot } from "@/hooks/useActiveDiorama";
import type { VillageEventRow } from "@/lib/village/eventTypes";

export interface PlacementInfo {
  key: string;
  imageUrl?: string | null;
  emoji: string;
  category?: string;
  size?: number;
}

export interface PikminSpeciesInfo {
  key: string;
  name: string;
  color: string | null;
  imageUrl: string | null;
}

export interface PikminLayerConfig {
  show: boolean;
  maxCap: number;
  speed: number;
  night: boolean;
  filters: Record<string, boolean>;
  species: PikminSpeciesInfo[];
  breakdown: Record<string, number>;
  threat?: boolean;
}

export interface VillageGameState {
  biome: BiomeKey;
  seed: string;
  diorama: DioramaRow | null;
  slots: DioramaSlot[];
  buildings: BaseBuilding[];
  buildingImageByType: Record<string, string | null>;
  buildingEmojiByType: Record<string, string>;
  /** opzionale: categoria per ogni building type, per filtro slot. */
  buildingCategoryByType?: Record<string, string>;
  placement: PlacementInfo | null;
  pikmin?: PikminLayerConfig;
  events?: VillageEventRow[];
  slotRenderMode?: "normal" | "build" | "editor";
}

export interface VillageGameEvents {
  selectBuilding: (id: string) => void;
  selectSlot: (info: {
    slotKey: string;
    x: number;
    y: number;
    allowedCategories: string[];
  }) => void;
  /** percentuali 0..100 rispetto a (width,height) immagine */
  placePosition: (pct: { x: number; y: number; slotKey?: string }) => void;
  tapGround: () => void;
}

/** Converti pct (0..100) → coordinate world. */
export function pctToWorld(px: number, py: number, w: number, h: number) {
  return { x: (px / 100) * w, y: (py / 100) * h };
}
export function worldToPct(x: number, y: number, w: number, h: number) {
  return { x: (x / w) * 100, y: (y / h) * 100 };
}
