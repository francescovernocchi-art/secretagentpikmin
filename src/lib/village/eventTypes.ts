import type { BonusKey } from "./bonuses";

export type VillageEventType =
  | "halloween"
  | "natale"
  | "meteora"
  | "invasione"
  | "nettare"
  | "bufera"
  | "eruzione"
  | "custom";

export const EVENT_TYPE_LABEL: Record<VillageEventType, string> = {
  halloween: "Halloween",
  natale: "Natale",
  meteora: "Meteora",
  invasione: "Invasione",
  nettare: "Pioggia di Nettare",
  bufera: "Bufera",
  eruzione: "Eruzione",
  custom: "Personalizzato",
};

export const EVENT_TYPE_ICON: Record<VillageEventType, string> = {
  halloween: "🎃",
  natale: "🎄",
  meteora: "☄️",
  invasione: "👾",
  nettare: "🍯",
  bufera: "🌪️",
  eruzione: "🌋",
  custom: "✨",
};

/** Preset effetti consigliato per ciascun tipo. */
export const EVENT_TYPE_PRESET: Record<VillageEventType, EventEffectsConfig> = {
  halloween:  { particles: { kind: "embers",  color: "#ff8a00", count: 40 }, overlay: { tint: "#3a0a4d", alpha: 0.22 } },
  natale:     { particles: { kind: "snow",    color: "#ffffff", count: 80 }, overlay: { tint: "#a5d8ff", alpha: 0.15 } },
  meteora:    { particles: { kind: "meteor",  color: "#ffd166", count: 6 },  glow:    { color: "#ff5e3a", intensity: 0.4 } },
  invasione:  { particles: { kind: "embers",  color: "#ff3b3b", count: 30 }, overlay: { tint: "#400000", alpha: 0.25 } },
  nettare:    { particles: { kind: "nectar",  color: "#ffd54a", count: 60 }, glow:    { color: "#ffea7a", intensity: 0.3 } },
  bufera:     { particles: { kind: "rain",    color: "#9ec5ff", count: 120 }, overlay: { tint: "#0a1a3a", alpha: 0.35 } },
  eruzione:   { particles: { kind: "embers",  color: "#ff5500", count: 70 }, overlay: { tint: "#3a0d00", alpha: 0.28 }, glow: { color: "#ff6a00", intensity: 0.5 } },
  custom:     {},
};

export type ParticleKind = "snow" | "rain" | "leaves" | "embers" | "meteor" | "nectar" | "sparkle";

export interface EventEffectsConfig {
  particles?: { kind: ParticleKind; color?: string; count?: number };
  glow?:      { color: string; intensity?: number };
  overlay?:   { tint?: string; alpha?: number };
}

export interface EventBonus {
  key: BonusKey;
  amount: number;
  label?: string;
}

export interface VillageEventRow {
  id: string;
  key: string;
  name: string;
  event_type: VillageEventType;
  biome_key: string | null;
  description: string | null;
  icon: string;
  overlay_image_url: string | null;
  effects: EventEffectsConfig;
  bonuses: EventBonus[];
  maluses: EventBonus[];
  priority: number;
  duration_minutes: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}
