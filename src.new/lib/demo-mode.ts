/**
 * Demo mode — giocabile locale per Francesco e Lorenzo senza Supabase.
 */
import { isSupabaseConfigured } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import { getSession, setSession, type Role, type Session } from "@/lib/session";
import type { DbChatMessage, DbInventoryItem } from "@/types/phase2-db";
import type { DbFamilyTradeItem, DbFamilyTradeOffer, FamilyTradeOfferFull } from "@/types/phase4-db";
import { SHIP_PARTS } from "@/data/secretPikminWorld";

const DEMO_FLAG = "secretPikmin.demo.active";
const DEMO_SEED_VERSION = "secretPikmin.demo.seed.v1";

export const DEMO_AGENTS = {
  papa: { role: "papa" as Role, name: "Francesco", emoji: "🕶️" },
  lorenzo: { role: "lorenzo" as Role, name: "Lorenzo", emoji: "🌱" },
};

export const DEMO_INGREDIENTS = [
  { key: "miele_dorato", name: "Miele dorato", emoji: "🍯", rarity: "comune", price_coins: 25 },
  { key: "seme_rosso", name: "Seme rosso", emoji: "🔴", rarity: "comune", price_coins: 15 },
  { key: "cristallo_verde", name: "Cristallo verde", emoji: "💚", rarity: "raro", price_coins: 55 },
  { key: "fungo_luminoso", name: "Fungo luminoso", emoji: "🍄", rarity: "inusuale", price_coins: 35 },
];

export const DEMO_RECIPES = [
  {
    id: "demo-rec-1",
    result_name: "Nettare stellare",
    result_emoji: "✨",
    description: "Potenzia i Pikmin per 1 spedizione.",
    xp: 20,
    price_coins: 40,
    locked: true,
  },
  {
    id: "demo-rec-2",
    result_name: "Barretta energetica",
    result_emoji: "⚡",
    description: "Rifornimento rapido per la navicella.",
    xp: 15,
    price_coins: 30,
    locked: true,
  },
];

export function isDemoModeActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DEMO_FLAG) === "1";
  } catch {
    return false;
  }
}

export function isDemoEligible(): boolean {
  return !isSupabaseConfigured() || isDemoModeActive();
}

export function shouldOfferDemoEntry(): boolean {
  if (typeof window === "undefined") return false;
  if (getSession()) return false;
  return !isSupabaseConfigured() || true;
}

export function enterDemoSession(role: Role): Session {
  const profile = DEMO_AGENTS[role];
  ensureDemoSeed();
  const session: Session = {
    role: profile.role,
    name: profile.name,
    emoji: profile.emoji,
    loggedAt: Date.now(),
  };
  setSession(session);
  try {
    localStorage.setItem(DEMO_FLAG, "1");
  } catch { /* ignore */ }
  return session;
}

export function exitDemoMode(): void {
  try {
    localStorage.removeItem(DEMO_FLAG);
  } catch { /* ignore */ }
}

function richInventory(agent: string): DbInventoryItem[] {
  const papaItems: Omit<DbInventoryItem, "id" | "agent_key">[] = [
    { item_key: "cristallo_rame", item_name: "Cristallo di rame", emoji: "💎", category: "oggetto", quantity: 2, sell_price: 120 },
    { item_key: "miele_dorato", item_name: "Miele dorato", emoji: "🍯", category: "ingrediente", quantity: 5, sell_price: 30 },
    { item_key: "frutta_bosco", item_name: "Frutta di bosco", emoji: "🫐", category: "ingrediente", quantity: 6, sell_price: 18 },
    { item_key: "batteria_piccola", item_name: "Batteria piccola", emoji: "🔋", category: "materiale", quantity: 2, sell_price: 40 },
  ];
  const lorenzoItems: Omit<DbInventoryItem, "id" | "agent_key">[] = [
    { item_key: "batteria_usata", item_name: "Batteria usata", emoji: "🔋", category: "materiale", quantity: 3, sell_price: 45 },
    { item_key: "seme_rosso", item_name: "Seme rosso", emoji: "🔴", category: "ingrediente", quantity: 8, sell_price: 15 },
    { item_key: "reliquia_antica", item_name: "Reliquia antica", emoji: "🏺", category: "oggetto", quantity: 1, sell_price: 90 },
    { item_key: "cristallo_energia", item_name: "Cristallo energia", emoji: "💠", category: "materiale", quantity: 4, sell_price: 55 },
  ];
  const base = agent === "papa" ? papaItems : lorenzoItems;
  return base.map((b, i) => ({
    id: `demo-inv-${agent}-${i}`,
    agent_key: agent,
    ...b,
  }));
}

function seedDemoTrades(): void {
  const offerId = "demo-trade-incoming";
  const existing = localStore.getAllTradeOffers("lorenzo");
  if (existing.some((o) => o.id === offerId)) return;

  const offer: DbFamilyTradeOffer = {
    id: offerId,
    from_agent: "papa",
    to_agent: "lorenzo",
    status: "pending",
    message: "Ti scambio miele per una batteria — serve al laboratorio!",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
    resolved_at: null,
  };
  const items: DbFamilyTradeItem[] = [
    {
      id: "demo-ti-1",
      offer_id: offerId,
      side: "offer",
      agent_key: "papa",
      item_key: "miele_dorato",
      item_name: "Miele dorato",
      emoji: "🍯",
      category: "ingrediente",
      quantity: 2,
      sell_price: 30,
    },
    {
      id: "demo-ti-2",
      offer_id: offerId,
      side: "request",
      agent_key: "lorenzo",
      item_key: "batteria_usata",
      item_name: "Batteria usata",
      emoji: "🔋",
      category: "materiale",
      quantity: 1,
      sell_price: 45,
    },
  ];
  localStore.upsertTradeOffer(offer, items);
}

function seedDemoChat(): void {
  const msgs: DbChatMessage[] = [
    {
      id: "demo-chat-1",
      channel: "famiglia",
      sender_agent: "papa",
      content: "Benvenuti nella demo Secret Pikmin! Provate scanner, market e villaggio.",
      message_type: "text",
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "demo-chat-2",
      channel: "missioni",
      sender_agent: "lorenzo",
      content: "Ho trovato un pezzo della navicella nel bosco.",
      message_type: "quick",
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "demo-chat-3",
      channel: "radar",
      sender_agent: "papa",
      content: "Segnale forte a nord-est — aprite /radar e scansionate.",
      message_type: "text",
      created_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ];
  for (const m of msgs) {
    const all = localStore.getChat();
    if (!all.some((x) => x.id === m.id)) localStore.addChat(m);
  }
}

export function ensureDemoSeed(): void {
  if (typeof window === "undefined") return;
  try {
    const v = localStorage.getItem(DEMO_SEED_VERSION);
    if (v === "1") return;
  } catch { /* continue */ }

  localStore.setInventory("papa", richInventory("papa"));
  localStore.setInventory("lorenzo", richInventory("lorenzo"));

  const parts = localStore.getShipParts().map((p, i) =>
    i < 2 ? { ...p, collected: true, collected_by: "papa", collected_at: new Date().toISOString() } : p,
  );
  localStore.setShipParts(parts);

  seedDemoChat();
  seedDemoTrades();

  try {
    localStorage.setItem(DEMO_SEED_VERSION, "1");
  } catch { /* ignore */ }
}

export function demoShipProgressLabel(): string {
  const collected = SHIP_PARTS.filter((p) => p.collected).length;
  return `${collected}/${SHIP_PARTS.length} pezzi demo`;
}
