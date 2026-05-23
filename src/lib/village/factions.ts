// Sistema fazioni villaggio — Secret Agent Pikmin
export type FactionKey = "eco" | "tech" | "battle" | "mystic";

export interface FactionConfig {
  key: FactionKey;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  // Visual palette (overlay sopra il bioma esistente)
  primary: string;
  secondary: string;
  glow: string;
  particles: "leaves" | "sparks" | "embers" | "crystals";
  // Bonus reali applicati al calcolo aggregato
  bonuses: {
    pikminGrowthMult: number;   // moltiplicatore generazione pikmin
    energyMaxBonus: number;     // +energy_max base
    defenseBonus: number;       // +defense_rating base
    discoveryRate: number;      // % bonus scoperte rare
  };
  weakness: string;
  favoredPikmin: string[];
  preferredBuildings: string[]; // chiavi catalog
}

export const FACTIONS: Record<FactionKey, FactionConfig> = {
  eco: {
    key: "eco",
    name: "Colonia Eco",
    tagline: "La natura è la nostra arma",
    description:
      "Vive in simbiosi con la foresta. Pikmin crescono più velocemente, l'energia scorre dalle piante stesse.",
    emoji: "🌿",
    primary: "#7cd99a",
    secondary: "#3d6b4d",
    glow: "#b8f5a0",
    particles: "leaves",
    bonuses: {
      pikminGrowthMult: 1.35,
      energyMaxBonus: 25,
      defenseBonus: 0,
      discoveryRate: 0.1,
    },
    weakness: "Vulnerabile agli attacchi tecnologici",
    favoredPikmin: ["rosso", "giallo"],
    preferredBuildings: ["pikmin_greenhouse", "medical_station", "research_lab"],
  },
  tech: {
    key: "tech",
    name: "Fortezza Tech",
    tagline: "Il futuro è già qui",
    description:
      "Colonia futuristica iper-tecnologica. Radar avanzati, droni autonomi, scansioni potenziate.",
    emoji: "⚙️",
    primary: "#7dd3fc",
    secondary: "#1e3a8a",
    glow: "#67e8f9",
    particles: "sparks",
    bonuses: {
      pikminGrowthMult: 0.9,
      energyMaxBonus: 100,
      defenseBonus: 15,
      discoveryRate: 0.2,
    },
    weakness: "Consumo energetico altissimo",
    favoredPikmin: ["blu", "viola"],
    preferredBuildings: ["radar_station", "drone_factory", "energy_reactor", "gadget_lab"],
  },
  battle: {
    key: "battle",
    name: "Campo Battaglia",
    tagline: "Solo i forti sopravvivono",
    description:
      "Colonia militare. Mura più resistenti, bonus offensivi, strutture difensive evolute.",
    emoji: "⚔️",
    primary: "#fb923c",
    secondary: "#7c2d12",
    glow: "#fdba74",
    particles: "embers",
    bonuses: {
      pikminGrowthMult: 1.0,
      energyMaxBonus: 10,
      defenseBonus: 50,
      discoveryRate: 0.0,
    },
    weakness: "Generazione risorse ridotta",
    favoredPikmin: ["rosso", "roccia"],
    preferredBuildings: ["defense_tower", "training_camp", "command_center"],
  },
  mystic: {
    key: "mystic",
    name: "Alveare Mistico",
    tagline: "Custodi degli enigmi",
    description:
      "Colonia ancorata a un'anomalia. Eventi rari, Pikmin speciali, scoperte impossibili.",
    emoji: "🔮",
    primary: "#c084fc",
    secondary: "#4c1d95",
    glow: "#e9d5ff",
    particles: "crystals",
    bonuses: {
      pikminGrowthMult: 1.1,
      energyMaxBonus: 50,
      defenseBonus: 10,
      discoveryRate: 0.45,
    },
    weakness: "Imprevedibile, eventi caotici",
    favoredPikmin: ["viola", "alato", "bianco"],
    preferredBuildings: ["research_lab", "gadget_lab", "radar_station"],
  },
};

export const FACTION_LIST = Object.values(FACTIONS);
