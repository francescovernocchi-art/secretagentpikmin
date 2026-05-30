import type { LucideIcon } from "lucide-react";

export type CoreMissionKey = "ship" | "debt" | "planet" | "bestiary";

export type PikminTypeKey =
  | "rosso"
  | "blu"
  | "giallo"
  | "viola"
  | "bianco"
  | "roccia"
  | "alato"
  | "ghiaccio"
  | "luminoso";

export type PikminSpecializationKey =
  | "raccolta"
  | "trasporto"
  | "ricerca"
  | "scouting"
  | "spionaggio"
  | "combattimento"
  | "supporto";

export type PikminDutyKey =
  | "trasporto"
  | "battaglia"
  | "raccolta"
  | "scouting"
  | "ricerca_oggetti"
  | "studio_mostri"
  | "spedizione"
  | "difesa_villaggio";

export type BiomeKey =
  | "bosco"
  | "giardino"
  | "acqua"
  | "roccia"
  | "grotta"
  | "campo"
  | "citta"
  | "industriale";

export type ShipPartKey =
  | "motore"
  | "antenna"
  | "cabina"
  | "modulo_energia"
  | "stabilizzatori"
  | "nucleo";

export type ScannerTargetType =
  | "pikmin_selvatico"
  | "oggetto_raro"
  | "ingrediente"
  | "materiale"
  | "mostro"
  | "anomalia"
  | "pezzo_navicella";

export type VillageBuildingKey =
  | "centro_controllo"
  | "magazzino"
  | "accademia"
  | "laboratorio"
  | "mercato"
  | "hangar";

export type ChatChannelKey = "famiglia" | "missioni" | "villaggio" | "comandante";

export type PikminOperationalStatus = "disponibile" | "in_missione" | "in_spedizione" | "ferito" | "addestramento";

export interface FamilyCommander {
  id: string;
  name: string;
  role: "comandante";
  emoji: string;
  online: boolean;
  lastSeen?: string;
}

export interface PlanetState {
  debtTotal: number;
  debtPaid: number;
  food: number;
  energy: number;
  morale: number;
}

export interface ShipPartState {
  key: ShipPartKey;
  name: string;
  emoji: string;
  collected: boolean;
  locationHint?: string;
}

export interface CoreMission {
  key: CoreMissionKey;
  title: string;
  short: string;
  description: string;
  icon: LucideIcon;
  emoji: string;
  progressLabel: string;
  color: string;
  progress: number;
  progressMax: number;
}

export interface PikminTypeDefinition {
  key: PikminTypeKey;
  label: string;
  emoji: string;
  color: string;
  predispositions: PikminSpecializationKey[];
  affinities: BiomeKey[];
  notes: string;
}

export interface PikminSpecialization {
  key: PikminSpecializationKey;
  title: string;
  icon: LucideIcon;
  emoji: string;
  duties: string[];
  bonuses: string[];
  bestTypes: string[];
}

export interface PikminUnit {
  id: string;
  name: string;
  type: PikminTypeKey;
  level: number;
  experience: number;
  experienceToNext: number;
  specialization: PikminSpecializationKey;
  stats: {
    forza: number;
    velocita: number;
    resistenza: number;
    intelligenza: number;
  };
  preferredBiome: BiomeKey;
  story: string;
  status: PikminOperationalStatus;
  ownerId: string;
  specBadge?: string | null;
}

export interface BiomeDefinition {
  key: BiomeKey;
  label: string;
  emoji: string;
  theme: string;
  resources: string[];
  ingredients: string[];
  frequentPikmin: PikminTypeKey[];
  frequentMonsters: string[];
  events: string[];
  rarity: "comune" | "raro" | "epico";
  bonus: string;
  malus?: string;
}

export interface ScannerTarget {
  type: ScannerTargetType;
  label: string;
  icon: LucideIcon;
  emoji: string;
  note: string;
  biomeLinked: boolean;
}

export interface VillageBuildingDefinition {
  key: VillageBuildingKey;
  name: string;
  emoji: string;
  description: string;
  level: number;
  maxLevel: number;
}

export interface ExpeditionSummary {
  id: string;
  title: string;
  biome: BiomeKey;
  status: "attiva" | "completata" | "in_ritorno";
  pikminCount: number;
  etaMinutes: number;
}

export interface DiscoverySummary {
  id: string;
  label: string;
  emoji: string;
  type: ScannerTargetType;
  foundBy: string;
  foundAt: string;
}

export interface MarketListing {
  id: string;
  name: string;
  emoji: string;
  price: number;
  seller: string;
  category: "oggetto" | "materiale" | "ingrediente";
}

export interface FamilyTradeOffer {
  id: string;
  from: string;
  to: string;
  offer: string;
  request: string;
  status: "aperta" | "completata";
}

export interface ChatQuickMessage {
  id: string;
  text: string;
  emoji: string;
  channel: ChatChannelKey;
}

export interface GameIdentity {
  title: string;
  subtitle: string;
  tagline: string;
  rule: string;
}
