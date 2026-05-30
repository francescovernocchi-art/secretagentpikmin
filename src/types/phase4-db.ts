export type FamilyTradeStatus = "draft" | "pending" | "accepted" | "rejected" | "cancelled" | "completed";

export type FamilyTradeSide = "offer" | "request";

export interface DbFamilyTradeOffer {
  id: string;
  from_agent: string;
  to_agent: string;
  status: FamilyTradeStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface DbFamilyTradeItem {
  id: string;
  offer_id: string;
  side: FamilyTradeSide;
  agent_key: string;
  item_key: string;
  item_name: string;
  emoji: string;
  category: string;
  quantity: number;
  sell_price: number;
}

export interface DbFamilyTradeHistory {
  id: string;
  offer_id: string;
  from_agent: string;
  to_agent: string;
  action: string;
  snapshot: Record<string, unknown>;
  created_at: string;
}

export interface FamilyTradeOfferFull extends DbFamilyTradeOffer {
  items: DbFamilyTradeItem[];
}

export type GameNotificationKind =
  | "trade_received"
  | "trade_accepted"
  | "trade_rejected"
  | "expedition_completed"
  | "ship_part_found"
  | "debt_reduced"
  | "monster_classified"
  | "village_created";

export interface DbGameNotification {
  id: string;
  agent_key: string;
  kind: GameNotificationKind | string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface DbVillageExtended {
  id: string;
  owner_agent: string;
  name: string;
  biome_key: string;
  lat: number | null;
  lng: number | null;
  level: number;
  is_primary: boolean;
  action_radius_m: number;
}

export type RemoteControlTier = "none" | "base" | "expeditions" | "full";

export interface PlayerLocationState {
  lat: number | null;
  lng: number | null;
  current_biome: string;
  source: "gps" | "manual" | "default";
  updated_at: string;
}
