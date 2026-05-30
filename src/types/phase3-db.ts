import type { BiomeKey, PikminSpecializationKey } from "@/types/secretPikmin";

export type PikminXpReason =
  | "scan"
  | "raccolta"
  | "pikmin_selvatico"
  | "studio_mostro"
  | "pezzo_navicella"
  | "spedizione"
  | "vendita"
  | "trasformazione"
  | "difesa";

export type BestiaryStudyStatus = "avvistato" | "studiato" | "classificato";

export type TransformTarget = "food" | "energy" | "materials" | "credits";

export type ExpeditionObjectiveKey =
  | "raccolta"
  | "ricerca_navicella"
  | "studio_mostri"
  | "scouting"
  | "ingredienti"
  | "difesa";

export interface DbPikminActivityLog {
  id: string;
  pikmin_id: string;
  owner_agent: string;
  reason: PikminXpReason | string;
  xp_amount: number;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface DbBestiaryEntryExtended {
  study_status: BestiaryStudyStatus;
  data_points: number;
  weakness_unlocked: boolean;
}

export interface Phase3Expedition {
  id: string;
  agent_key: string;
  biome: BiomeKey;
  objective: ExpeditionObjectiveKey;
  title: string;
  pikmin_ids: string[];
  duration_minutes: number;
  risk: "basso" | "medio" | "alto";
  success_chance: number;
  status: "active" | "completed" | "failed";
  started_at: string;
  end_at: string;
  rewards?: Record<string, unknown>;
  summary?: string;
}

export interface TransformResult {
  success: boolean;
  message: string;
  planetDelta?: { food?: number; energy?: number };
  credits?: number;
}

export const EXPEDITION_OBJECTIVES: Array<{
  key: ExpeditionObjectiveKey;
  label: string;
  emoji: string;
  baseDuration: number;
  xpPerPikmin: number;
  specBonus: PikminSpecializationKey[];
}> = [
  { key: "raccolta", label: "Raccolta", emoji: "🍃", baseDuration: 20, xpPerPikmin: 25, specBonus: ["raccolta", "trasporto"] },
  { key: "ricerca_navicella", label: "Ricerca pezzi navicella", emoji: "🚀", baseDuration: 35, xpPerPikmin: 40, specBonus: ["ricerca", "scouting"] },
  { key: "studio_mostri", label: "Studio mostri", emoji: "👾", baseDuration: 25, xpPerPikmin: 35, specBonus: ["spionaggio", "combattimento"] },
  { key: "scouting", label: "Scouting bioma", emoji: "🗺️", baseDuration: 18, xpPerPikmin: 20, specBonus: ["scouting", "ricerca"] },
  { key: "ingredienti", label: "Recupero ingredienti", emoji: "🍯", baseDuration: 22, xpPerPikmin: 22, specBonus: ["raccolta", "ricerca"] },
  { key: "difesa", label: "Difesa villaggio", emoji: "🛡️", baseDuration: 30, xpPerPikmin: 45, specBonus: ["combattimento", "supporto"] },
];

export const SPEC_BADGES: Record<PikminSpecializationKey, string[]> = {
  raccolta: ["Raccoglitore", "Mietitore d'oro", "Maestro raccolta"],
  trasporto: ["Corriere", "Portatore", "Logista"],
  ricerca: ["Detective", "Cercatore", "Archeologo"],
  scouting: ["Esploratore", "Cartografo", "Pioniere"],
  spionaggio: ["Ombra", "Analista", "Informatore"],
  combattimento: ["Guardiano", "Assaltatore", "Campione"],
  supporto: ["Medico", "Tecnico", "Stratega"],
};
