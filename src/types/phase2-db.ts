import type { ChatChannelKey, PikminSpecializationKey, PikminTypeKey, BiomeKey } from "@/types/secretPikmin";

export type DataSource = "supabase" | "local";

export interface DbFamilyMember {
  id: string;
  agent_key: string;
  display_name: string;
  role: string;
  rank: string;
  emoji: string;
  online: boolean;
  last_seen_at: string;
}

export interface DbPlayerProfile {
  agent_key: string;
  current_biome: BiomeKey;
  coins: number;
  level: number;
  xp: number;
  lat: number | null;
  lng: number | null;
}

export interface DbPlanetStatus {
  id: string;
  debt_total: number;
  debt_paid: number;
  food: number;
  energy: number;
  morale: number;
  bestiary_count: number;
  bestiary_total: number;
}

export interface DbSpaceshipPart {
  key: string;
  name: string;
  emoji: string;
  sort_order: number;
  location_hint: string | null;
  collected: boolean;
  collected_by: string | null;
  collected_at: string | null;
}

export interface DbPikminUnit {
  id: string;
  owner_agent: string;
  name: string;
  type_key: PikminTypeKey;
  level: number;
  experience: number;
  experience_to_next: number;
  specialization_key: PikminSpecializationKey | null;
  spec_badge?: string | null;
  total_xp_earned?: number;
  stats: { forza: number; velocita: number; resistenza: number; intelligenza: number };
  preferred_biome: BiomeKey;
  story: string | null;
  status: string;
  updated_at?: string;
}

export interface DbInventoryItem {
  id: string;
  agent_key: string;
  item_key: string;
  item_name: string;
  emoji: string;
  category: "oggetto" | "materiale" | "ingrediente";
  quantity: number;
  sell_price: number;
}

export interface DbVillage {
  id: string;
  owner_agent: string;
  name: string;
  biome_key: BiomeKey;
  lat?: number | null;
  lng?: number | null;
  level: number;
  is_primary: boolean;
  action_radius_m?: number;
}

export interface DbVillageBuilding {
  id: string;
  village_id: string;
  building_key: string;
  name: string;
  emoji: string;
  level: number;
  max_level: number;
  status: string;
}

export interface DbScanResult {
  id: string;
  agent_key: string;
  biome_key: string;
  target_type: string;
  label: string;
  emoji: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface DbMarketTransaction {
  id: string;
  agent_key: string;
  item_key: string;
  item_name: string;
  quantity: number;
  price: number;
  transaction_type: string;
  created_at: string;
}

export interface DbChatMessage {
  id: string;
  channel: ChatChannelKey;
  sender_agent: string;
  content: string;
  message_type: string;
  created_at: string;
}

export interface DbBestiaryEntry {
  id: string;
  creature_key: string;
  name: string;
  emoji: string | null;
  biome_key: string | null;
  rarity: string;
  danger_level: number;
  weakness: string | null;
  discovered_by: string | null;
  scan_count: number;
  study_status?: "avvistato" | "studiato" | "classificato";
  data_points?: number;
  weakness_unlocked?: boolean;
}

export interface DbExpeditionRow {
  id: string;
  title: string;
  biome: string;
  status: string;
  duration_minutes: number;
  end_at: string | null;
  created_by: string;
}

export interface ScanDiscovery {
  targetType: string;
  label: string;
  emoji: string;
  payload: Record<string, unknown>;
}

export interface MissionProgressData {
  shipCollected: number;
  shipTotal: number;
  debtPaid: number;
  debtTotal: number;
  food: number;
  energy: number;
  morale: number;
  bestiaryCount: number;
  bestiaryTotal: number;
}
