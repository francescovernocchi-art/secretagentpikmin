import {
  BIOMES,
  MOCK_DISCOVERIES,
  MOCK_EXPEDITIONS,
  MOCK_FAMILY_ONLINE,
  MOCK_PIKMIN_SQUAD,
  PLANET_STATE,
  SHIP_PARTS,
  VILLAGE_BUILDINGS,
  MOCK_MARKET_LISTINGS,
  VILLAGE_RULES,
} from "@/data/secretPikminWorld";
import type {
  DbBestiaryEntry,
  DbChatMessage,
  DbExpeditionRow,
  DbInventoryItem,
  DbPikminUnit,
  DbPlanetStatus,
  DbScanResult,
  DbSpaceshipPart,
  DbVillage,
  DbVillageBuilding,
  DbFamilyMember,
  DbMarketTransaction,
  MissionProgressData,
} from "@/types/phase2-db";
import type { DbPikminActivityLog, Phase3Expedition } from "@/types/phase3-db";
import type {
  DbFamilyTradeHistory,
  DbFamilyTradeItem,
  DbFamilyTradeOffer,
  DbGameNotification,
  DbVillageExtended,
  FamilyTradeOfferFull,
} from "@/types/phase4-db";
import type { PlayerLocationState } from "@/types/phase4-db";
import type { ChatChannelKey, PikminSpecializationKey, PikminTypeKey, BiomeKey } from "@/types/secretPikmin";

const PREFIX = "secretPikmin.phase2.";

function read<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : seed;
  } catch {
    return seed;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

function seedPlanet(): DbPlanetStatus {
  return {
    id: "origin",
    debt_total: PLANET_STATE.debtTotal,
    debt_paid: PLANET_STATE.debtPaid,
    food: PLANET_STATE.food,
    energy: PLANET_STATE.energy,
    morale: PLANET_STATE.morale,
    bestiary_count: 12,
    bestiary_total: 48,
  };
}

function seedShipParts(): DbSpaceshipPart[] {
  return SHIP_PARTS.map((p, i) => ({
    key: p.key,
    name: p.name,
    emoji: p.emoji,
    sort_order: i + 1,
    location_hint: p.locationHint ?? null,
    collected: p.collected,
    collected_by: p.collected ? "papa" : null,
    collected_at: p.collected ? new Date().toISOString() : null,
  }));
}

function seedPikmin(): DbPikminUnit[] {
  return MOCK_PIKMIN_SQUAD.map((p) => ({
    id: p.id,
    owner_agent: p.ownerId === "francesco" ? "papa" : "lorenzo",
    name: p.name,
    type_key: p.type as PikminTypeKey,
    level: p.level,
    experience: p.experience,
    experience_to_next: p.experienceToNext,
    specialization_key: p.specialization as PikminSpecializationKey,
    stats: p.stats,
    preferred_biome: p.preferredBiome,
    story: p.story,
    status: p.status,
  }));
}

function seedInventory(agent: string): DbInventoryItem[] {
  const base =
    agent === "papa"
      ? [
          { item_key: "cristallo_rame", item_name: "Cristallo di rame", emoji: "💎", category: "oggetto" as const, quantity: 2, sell_price: 120 },
          { item_key: "miele_dorato", item_name: "Miele dorato", emoji: "🍯", category: "ingrediente" as const, quantity: 5, sell_price: 30 },
        ]
      : [
          { item_key: "batteria_usata", item_name: "Batteria usata", emoji: "🔋", category: "materiale" as const, quantity: 3, sell_price: 45 },
          { item_key: "seme_rosso", item_name: "Seme rosso", emoji: "🔴", category: "ingrediente" as const, quantity: 8, sell_price: 15 },
        ];
  return base.map((b, i) => ({
    id: `local-inv-${agent}-${i}`,
    agent_key: agent,
    ...b,
  }));
}

function seedVillage(agent: string): DbVillage {
  return {
    id: `local-village-${agent}`,
    owner_agent: agent,
    name: agent === "papa" ? "Colonia Francesco" : "Base Lorenzo",
    biome_key: agent === "papa" ? "bosco" : "giardino",
    level: 1,
    is_primary: true,
  };
}

function seedVillageBuildings(villageId: string): DbVillageBuilding[] {
  return VILLAGE_BUILDINGS.map((b, i) => ({
    id: `local-bld-${villageId}-${i}`,
    village_id: villageId,
    building_key: b.key,
    name: b.name,
    emoji: b.emoji,
    level: b.level,
    max_level: b.maxLevel,
    status: "active",
  }));
}

function seedFamily(): DbFamilyMember[] {
  return MOCK_FAMILY_ONLINE.map((f) => ({
    id: f.id,
    agent_key: f.id === "francesco" ? "papa" : "lorenzo",
    display_name: f.name,
    role: "comandante",
    rank: f.id === "francesco" ? "comandante" : "comandante_junior",
    emoji: f.emoji,
    online: f.online,
    last_seen_at: new Date().toISOString(),
  }));
}

function seedScans(): DbScanResult[] {
  return MOCK_DISCOVERIES.map((d, i) => ({
    id: `local-scan-${i}`,
    agent_key: d.foundBy.toLowerCase().includes("lorenzo") ? "lorenzo" : "papa",
    biome_key: "bosco",
    target_type: d.type,
    label: d.label,
    emoji: d.emoji,
    payload: {},
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
  }));
}

function seedChat(): DbChatMessage[] {
  return [
    { id: "local-chat-1", channel: "famiglia", sender_agent: "papa", content: "Missione Famiglia attiva.", message_type: "text", created_at: new Date().toISOString() },
    { id: "local-chat-2", channel: "missioni", sender_agent: "lorenzo", content: "Ho trovato un pezzo della navicella.", message_type: "quick", created_at: new Date().toISOString() },
  ];
}

function seedBestiary(): DbBestiaryEntry[] {
  return [
    { id: "local-be-1", creature_key: "bulborb_nano", name: "Bulborb nano", emoji: "👾", biome_key: "bosco", rarity: "comune", danger_level: 2, weakness: null, discovered_by: "lorenzo", scan_count: 1, study_status: "avvistato", data_points: 1, weakness_unlocked: false },
    { id: "local-be-2", creature_key: "scarabee", name: "Scarabée", emoji: "🪲", biome_key: "bosco", rarity: "comune", danger_level: 1, weakness: "schiacciamento", discovered_by: "papa", scan_count: 2, study_status: "studiato", data_points: 3, weakness_unlocked: false },
  ];
}

function seedExpeditions(): DbExpeditionRow[] {
  return MOCK_EXPEDITIONS.map((e) => ({
    id: e.id,
    title: e.title,
    biome: e.biome,
    status: e.status === "attiva" ? "running" : e.status === "in_ritorno" ? "returning" : "completed",
    duration_minutes: e.etaMinutes,
    end_at: new Date(Date.now() + e.etaMinutes * 60000).toISOString(),
    created_by: "papa",
  }));
}

export const localStore = {
  getPlanet(): DbPlanetStatus {
    return read("planet", seedPlanet());
  },
  setPlanet(p: DbPlanetStatus) {
    write("planet", p);
  },

  getShipParts(): DbSpaceshipPart[] {
    return read("shipParts", seedShipParts());
  },
  setShipParts(parts: DbSpaceshipPart[]) {
    write("shipParts", parts);
  },

  getPikminUnits(agent?: string): DbPikminUnit[] {
    const all = read("pikminUnits", seedPikmin());
    return agent ? all.filter((p) => p.owner_agent === agent) : all;
  },
  setPikminUnits(units: DbPikminUnit[]) {
    write("pikminUnits", units);
  },

  getInventory(agent: string): DbInventoryItem[] {
    const all = read<Record<string, DbInventoryItem[]>>("inventory", {});
    return all[agent] ?? seedInventory(agent);
  },
  setInventory(agent: string, items: DbInventoryItem[]) {
    const all = read<Record<string, DbInventoryItem[]>>("inventory", {});
    all[agent] = items;
    write("inventory", all);
  },

  getVillage(agent: string): DbVillage {
    const all = read<Record<string, DbVillage>>("villages", {});
    return all[agent] ?? seedVillage(agent);
  },
  getVillageBuildings(villageId: string): DbVillageBuilding[] {
    const all = read<Record<string, DbVillageBuilding[]>>("villageBuildings", {});
    return all[villageId] ?? seedVillageBuildings(villageId);
  },

  getFamily(): DbFamilyMember[] {
    return read("family", seedFamily());
  },

  getScans(limit = 10): DbScanResult[] {
    return read("scans", seedScans()).slice(0, limit);
  },
  addScan(scan: DbScanResult) {
    const scans = read("scans", seedScans());
    write("scans", [scan, ...scans].slice(0, 50));
  },

  getChat(channel?: ChatChannelKey): DbChatMessage[] {
    const all = read("chat", seedChat());
    return channel ? all.filter((m) => m.channel === channel) : all;
  },
  addChat(msg: DbChatMessage) {
    write("chat", [...read("chat", seedChat()), msg]);
  },

  getBestiary(): DbBestiaryEntry[] {
    return read("bestiary", seedBestiary());
  },
  upsertBestiary(entry: DbBestiaryEntry) {
    const all = read("bestiary", seedBestiary());
    const idx = all.findIndex((e) => e.creature_key === entry.creature_key);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        ...entry,
        scan_count: entry.scan_count ?? all[idx].scan_count + 1,
        data_points: entry.data_points ?? (all[idx].data_points ?? 0) + 1,
      };
    } else {
      all.push({ ...entry, study_status: entry.study_status ?? "avvistato", data_points: entry.data_points ?? 1, weakness_unlocked: entry.weakness_unlocked ?? false });
    }
    write("bestiary", all);
    const planet = localStore.getPlanet();
    planet.bestiary_count = all.length;
    localStore.setPlanet(planet);
  },

  getActivityLogs(): DbPikminActivityLog[] {
    return read("activityLog", []);
  },
  addActivityLog(log: DbPikminActivityLog) {
    const logs = read<DbPikminActivityLog[]>("activityLog", []);
    write("activityLog", [log, ...logs].slice(0, 100));
  },

  getPhase3Expeditions(): Phase3Expedition[] {
    return read("phase3Expeditions", []);
  },
  setPhase3Expeditions(exps: Phase3Expedition[]) {
    write("phase3Expeditions", exps);
  },
  addPhase3Expedition(exp: Phase3Expedition) {
    write("phase3Expeditions", [...read<Phase3Expedition[]>("phase3Expeditions", []), exp]);
  },

  getExpeditions(): DbExpeditionRow[] {
    return read("expeditions", seedExpeditions());
  },

  getTransactions(agent?: string): DbMarketTransaction[] {
    const all = read<DbMarketTransaction[]>("transactions", []);
    return agent ? all.filter((t) => t.agent_key === agent) : all;
  },
  addTransaction(tx: DbMarketTransaction) {
    write("transactions", [...read<DbMarketTransaction[]>("transactions", []), tx]);
  },

  getBiome(agent: string): string {
    return read(`biome.${agent}`, agent === "papa" ? "bosco" : "giardino");
  },
  setBiome(agent: string, biome: string) {
    write(`biome.${agent}`, biome);
  },

  missionProgress(): MissionProgressData {
    const planet = localStore.getPlanet();
    const parts = localStore.getShipParts();
    return {
      shipCollected: parts.filter((p) => p.collected).length,
      shipTotal: parts.length,
      debtPaid: planet.debt_paid,
      debtTotal: planet.debt_total,
      food: planet.food,
      energy: planet.energy,
      morale: planet.morale,
      bestiaryCount: planet.bestiary_count,
      bestiaryTotal: planet.bestiary_total,
    };
  },

  // ─── Phase 4: multi-village ───
  getAgentVillages(agent: string): DbVillageExtended[] {
    const all = read<Record<string, DbVillageExtended[]>>("agentVillages", {});
    if (all[agent]?.length) return all[agent];
    const primary = seedVillage(agent);
    return [{
      ...primary,
      lat: null,
      lng: null,
      action_radius_m: VILLAGE_RULES.actionRadiusMeters,
    }];
  },
  addVillage(village: DbVillageExtended, buildings: DbVillageBuilding[]) {
    const all = read<Record<string, DbVillageExtended[]>>("agentVillages", {});
    all[village.owner_agent] = [...(all[village.owner_agent] ?? localStore.getAgentVillages(village.owner_agent)), village];
    write("agentVillages", all);
    const bAll = read<Record<string, DbVillageBuilding[]>>("villageBuildings", {});
    bAll[village.id] = buildings;
    write("villageBuildings", bAll);
  },
  setVillageBuildings(villageId: string, buildings: DbVillageBuilding[]) {
    const all = read<Record<string, DbVillageBuilding[]>>("villageBuildings", {});
    all[villageId] = buildings;
    write("villageBuildings", all);
  },
  getActiveVillageId(agent: string): string | null {
    return read<string | null>(`activeVillage.${agent}`, null);
  },
  setActiveVillageId(agent: string, villageId: string) {
    write(`activeVillage.${agent}`, villageId);
  },

  getPlayerLocation(agent: string): PlayerLocationState {
    return read(`playerLocation.${agent}`, {
      lat: null,
      lng: null,
      current_biome: (agent === "papa" ? "bosco" : "giardino") as BiomeKey,
      source: "default",
      updated_at: new Date().toISOString(),
    });
  },
  setPlayerLocation(agent: string, state: PlayerLocationState) {
    write(`playerLocation.${agent}`, state);
  },

  // ─── Phase 4: family trades ───
  upsertTradeOffer(offer: DbFamilyTradeOffer, items: DbFamilyTradeItem[]) {
    const offers = read<FamilyTradeOfferFull[]>("familyTrades", []);
    const idx = offers.findIndex((o) => o.id === offer.id);
    const full = { ...offer, items };
    if (idx >= 0) offers[idx] = full;
    else offers.unshift(full);
    write("familyTrades", offers.slice(0, 50));
    const itemMap = read<Record<string, DbFamilyTradeItem[]>>("tradeItems", {});
    itemMap[offer.id] = items;
    write("tradeItems", itemMap);
  },
  getTradeOffer(id: string): FamilyTradeOfferFull | null {
    return read<FamilyTradeOfferFull[]>("familyTrades", []).find((o) => o.id === id) ?? null;
  },
  getAllTradeOffers(agent: string): FamilyTradeOfferFull[] {
    return read<FamilyTradeOfferFull[]>("familyTrades", []).filter(
      (o) => o.from_agent === agent || o.to_agent === agent,
    );
  },
  getTradeItems(offerId: string): DbFamilyTradeItem[] {
    return read<Record<string, DbFamilyTradeItem[]>>("tradeItems", {})[offerId] ?? [];
  },
  addTradeHistory(row: DbFamilyTradeHistory) {
    write("tradeHistory", [row, ...read<DbFamilyTradeHistory[]>("tradeHistory", [])].slice(0, 100));
  },
  getTradeHistory(agent: string): DbFamilyTradeHistory[] {
    return read<DbFamilyTradeHistory[]>("tradeHistory", []).filter(
      (h) => h.from_agent === agent || h.to_agent === agent,
    );
  },

  // ─── Phase 4: notifications ───
  getGameNotifications(agent: string): DbGameNotification[] {
    return read<DbGameNotification[]>(`notifications.${agent}`, []);
  },
  addGameNotification(n: DbGameNotification) {
    const key = `notifications.${n.agent_key}`;
    write(key, [n, ...read<DbGameNotification[]>(key, [])].slice(0, 50));
  },
  markNotificationRead(id: string, agent: string) {
    const key = `notifications.${agent}`;
    const all = read<DbGameNotification[]>(key, []);
    write(key, all.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  },
  markAllNotificationsRead(agent: string) {
    const key = `notifications.${agent}`;
    const now = new Date().toISOString();
    write(key, read<DbGameNotification[]>(key, []).map((n) => ({ ...n, read_at: n.read_at ?? now })));
  },
};

export function localInventoryAsMarketListings(agent: string) {
  return localStore.getInventory(agent).map((item) => ({
    id: item.id,
    name: item.item_name,
    emoji: item.emoji,
    price: item.sell_price,
    seller: agent === "papa" ? "Francesco" : "Lorenzo",
    category: item.category,
    item_key: item.item_key,
    quantity: item.quantity,
  }));
}

export { BIOMES, MOCK_MARKET_LISTINGS };
