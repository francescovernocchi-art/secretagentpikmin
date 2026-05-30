/**
 * Secret Pikmin — Art Direction ufficiale (Fase 6)
 * Palette per natura, energia aliena, missioni, pericolo, navicella.
 */

export const ART_PALETTE = {
  nature: {
    key: "nature",
    label: "Natura",
    primary: "#4ade80",
    secondary: "#3d7a4a",
    glow: "rgba(74, 222, 128, 0.45)",
    gradient: "linear-gradient(135deg, #3d7a4a 0%, #4ade80 50%, #2d5c38 100%)",
  },
  alien: {
    key: "alien",
    label: "Energia aliena",
    primary: "#a78bfa",
    secondary: "#6366f1",
    glow: "rgba(167, 139, 250, 0.5)",
    gradient: "linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #4c1d95 100%)",
  },
  mission: {
    key: "mission",
    label: "Missioni",
    primary: "#fbbf24",
    secondary: "#f59e0b",
    glow: "rgba(251, 191, 36, 0.45)",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fde047 50%, #d97706 100%)",
  },
  danger: {
    key: "danger",
    label: "Pericolo",
    primary: "#fb923c",
    secondary: "#ef4444",
    glow: "rgba(251, 146, 60, 0.45)",
    gradient: "linear-gradient(135deg, #ef4444 0%, #fb923c 50%, #c2410c 100%)",
  },
  ship: {
    key: "ship",
    label: "Navicella",
    primary: "#94a3b8",
    secondary: "#64748b",
    glow: "rgba(56, 189, 248, 0.5)",
    gradient: "linear-gradient(135deg, #64748b 0%, #94a3b8 40%, #38bdf8 100%)",
  },
} as const;

export type SectionTheme =
  | "home"
  | "village"
  | "mission"
  | "map"
  | "market"
  | "chat"
  | "bestiary";

export const SECTION_THEMES: Record<SectionTheme, keyof typeof ART_PALETTE> = {
  home: "nature",
  village: "nature",
  mission: "mission",
  map: "alien",
  market: "mission",
  chat: "alien",
  bestiary: "danger",
};

export function rarityColor(level: number): string {
  if (level >= 5) return ART_PALETTE.danger.primary;
  if (level >= 4) return ART_PALETTE.alien.primary;
  if (level >= 3) return ART_PALETTE.mission.primary;
  if (level >= 2) return ART_PALETTE.nature.primary;
  return ART_PALETTE.ship.secondary;
}

export function itemRarityFromPrice(price: number): { label: string; level: number } {
  if (price >= 80) return { label: "Epico", level: 4 };
  if (price >= 50) return { label: "Raro", level: 3 };
  if (price >= 25) return { label: "Inusuale", level: 2 };
  return { label: "Comune", level: 1 };
}
