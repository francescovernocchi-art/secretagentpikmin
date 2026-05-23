import { supabase } from "@/integrations/supabase/client";
import { spendCoins, addCoins } from "@/lib/coins";
import { consumeIngredient, grantIngredients } from "@/lib/ingredients";

export const PARTNER_OF: Record<string, string> = { papa: "lorenzo", lorenzo: "papa" };

export type BuildingStatus = "idle" | "building" | "upgrading";

export interface BaseRow {
  agent: string;
  name: string;
  level: number;
  theme: string;
  lat: number | null;
  lng: number | null;
  xp: number;
  created_at: string;
  updated_at: string;
}

export interface BuildingCatalog {
  key: string;
  name: string;
  emoji: string;
  description: string | null;
  category: string;
  max_level: number;
  base_cost_coins: number;
  base_cost_ingredients: string[];
  base_duration_minutes: number;
  bonus_per_level: Record<string, number>;
  sort_order: number;
}

export interface BaseBuilding {
  id: string;
  agent: string;
  type: string;
  level: number;
  status: BuildingStatus;
  started_at: string | null;
  build_end_at: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface BaseGift {
  id: string;
  from_agent: string;
  to_agent: string;
  payload: { coins?: number; ingredients?: string[]; boost_building_id?: string; boost_minutes?: number };
  message: string | null;
  created_at: string;
  claimed_at: string | null;
}

export const THEMES: Record<string, { label: string; sky: string; ground: string; accent: string }> = {
  foresta: { label: "Foresta", sky: "#7ec8a8", ground: "#3d6b4d", accent: "#a8e063" },
  lago:    { label: "Lago",    sky: "#7ec0e8", ground: "#3b6b88", accent: "#bfe9ff" },
  deserto: { label: "Deserto", sky: "#f3c98b", ground: "#a87241", accent: "#ffd98a" },
  notte:   { label: "Notte",   sky: "#2a3157", ground: "#1a1f3a", accent: "#a78bfa" },
};

// ---- Cost scaling ----
export function costForLevel(catalog: BuildingCatalog, targetLevel: number) {
  const mult = Math.pow(1.6, targetLevel - 1);
  return {
    coins: Math.round(catalog.base_cost_coins * mult),
    ingredients: catalog.base_cost_ingredients ?? [],
    minutes: Math.max(1, Math.round(catalog.base_duration_minutes * Math.pow(1.4, targetLevel - 1))),
  };
}

export function buildingStage(level: number): "base" | "evoluto" | "maestro" {
  if (level >= 4) return "maestro";
  if (level >= 2) return "evoluto";
  return "base";
}

// ---- API ----
export async function fetchCatalog(): Promise<BuildingCatalog[]> {
  const { data, error } = await supabase.from("building_catalog").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as BuildingCatalog[];
}

export async function getBase(agent: string): Promise<BaseRow | null> {
  const { data } = await supabase.from("bases").select("*").eq("agent", agent).maybeSingle();
  return (data as unknown as BaseRow) ?? null;
}

export async function listBuildings(agent: string): Promise<BaseBuilding[]> {
  const { data } = await supabase.from("base_buildings").select("*").eq("agent", agent).order("created_at");
  return (data ?? []) as unknown as BaseBuilding[];
}

export async function createBase(agent: string, params: { name: string; theme: string; lat?: number | null; lng?: number | null }) {
  const { data, error } = await supabase
    .from("bases")
    .insert({ agent, name: params.name, theme: params.theme, lat: params.lat ?? null, lng: params.lng ?? null })
    .select("*")
    .single();
  if (error) throw error;
  await supabase.from("base_events").insert({ agent, type: "base_created", payload: { name: params.name } });
  return data as unknown as BaseRow;
}

export async function updateBase(agent: string, patch: Partial<Pick<BaseRow, "name" | "theme">>) {
  await supabase.from("bases").update({ ...patch, updated_at: new Date().toISOString() }).eq("agent", agent);
}

/** Avvia costruzione di una nuova struttura. */
export async function startBuilding(agent: string, catalog: BuildingCatalog, position: { x: number; y: number }) {
  const cost = costForLevel(catalog, 1);
  const ok = await spendCoins(agent, cost.coins, "base_build", { type: catalog.key });
  if (!ok) throw new Error(`Servono ${cost.coins} monete.`);
  for (const ing of cost.ingredients) {
    const consumed = await consumeIngredient(agent, ing);
    if (!consumed) throw new Error(`Manca l'ingrediente ${ing}.`);
  }
  const now = new Date();
  const end = new Date(now.getTime() + cost.minutes * 60_000);
  const { data, error } = await supabase
    .from("base_buildings")
    .insert({
      agent,
      type: catalog.key,
      level: 0,
      status: "building",
      started_at: now.toISOString(),
      build_end_at: end.toISOString(),
      position_x: position.x,
      position_y: position.y,
    })
    .select("*")
    .single();
  if (error) throw error;
  await supabase.from("base_events").insert({ agent, type: "build_started", payload: { type: catalog.key } });
  return data as unknown as BaseBuilding;
}

/** Avvia upgrade di una struttura idle. */
export async function startUpgrade(agent: string, building: BaseBuilding, catalog: BuildingCatalog) {
  if (building.level >= catalog.max_level) throw new Error("Livello massimo.");
  const cost = costForLevel(catalog, building.level + 1);
  const ok = await spendCoins(agent, cost.coins, "base_upgrade", { id: building.id });
  if (!ok) throw new Error(`Servono ${cost.coins} monete.`);
  for (const ing of cost.ingredients) {
    const c = await consumeIngredient(agent, ing);
    if (!c) throw new Error(`Manca l'ingrediente ${ing}.`);
  }
  const now = new Date();
  const end = new Date(now.getTime() + cost.minutes * 60_000);
  await supabase
    .from("base_buildings")
    .update({ status: "upgrading", started_at: now.toISOString(), build_end_at: end.toISOString(), updated_at: now.toISOString() })
    .eq("id", building.id);
}

/** Finalizza una costruzione/upgrade se il timer è scaduto. Idempotente. */
export async function completeBuilding(building: BaseBuilding) {
  if (building.status === "idle") return;
  if (!building.build_end_at) return;
  if (new Date(building.build_end_at).getTime() > Date.now()) return;
  const newLevel = building.status === "building" ? Math.max(1, building.level + 1) : building.level + 1;
  await supabase
    .from("base_buildings")
    .update({ status: "idle", level: newLevel, started_at: null, build_end_at: null, updated_at: new Date().toISOString() })
    .eq("id", building.id);
  await supabase.from("base_events").insert({
    agent: building.agent,
    type: "build_completed",
    payload: { type: building.type, level: newLevel },
  });
  // bonus XP base
  await supabase.rpc; // noop placeholder
  const { data: base } = await supabase.from("bases").select("xp,level").eq("agent", building.agent).maybeSingle();
  if (base) {
    const xp = (base.xp ?? 0) + 20 * newLevel;
    const lvl = Math.max(base.level, Math.floor(xp / 100) + 1);
    await supabase.from("bases").update({ xp, level: lvl, updated_at: new Date().toISOString() }).eq("agent", building.agent);
  }
}

export async function boostBuilding(agent: string, building: BaseBuilding, minutes: number) {
  if (!building.build_end_at) return;
  const end = new Date(new Date(building.build_end_at).getTime() - minutes * 60_000);
  await supabase.from("base_buildings").update({ build_end_at: end.toISOString() }).eq("id", building.id);
  await supabase.from("base_events").insert({
    agent: building.agent,
    type: "boost_received",
    payload: { from: agent, minutes, building: building.type },
  });
}

export async function sendGift(params: {
  from: string;
  to: string;
  coins?: number;
  ingredients?: string[];
  message?: string;
}) {
  if (params.coins && params.coins > 0) {
    const ok = await spendCoins(params.from, params.coins, "gift_send", { to: params.to });
    if (!ok) throw new Error("Monete insufficienti.");
  }
  if (params.ingredients) {
    for (const k of params.ingredients) {
      const c = await consumeIngredient(params.from, k);
      if (!c) throw new Error(`Manca ${k}.`);
    }
  }
  await supabase.from("base_gifts").insert({
    from_agent: params.from,
    to_agent: params.to,
    payload: { coins: params.coins, ingredients: params.ingredients },
    message: params.message ?? null,
  });
  await supabase.from("mission_notifications").insert({
    agent: params.to,
    kind: "base_gift",
    payload: { from: params.from, coins: params.coins, ingredients: params.ingredients ?? [] },
  });
}

export async function listGifts(agent: string): Promise<BaseGift[]> {
  const { data } = await supabase
    .from("base_gifts")
    .select("*")
    .eq("to_agent", agent)
    .is("claimed_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as BaseGift[];
}

export async function claimGift(agent: string, gift: BaseGift) {
  if (gift.payload.coins && gift.payload.coins > 0) {
    await addCoins(agent, gift.payload.coins, "gift_claim", { from: gift.from_agent });
  }
  if (gift.payload.ingredients?.length) {
    await grantIngredients(agent, gift.payload.ingredients);
  }
  await supabase.from("base_gifts").update({ claimed_at: new Date().toISOString() }).eq("id", gift.id);
}

/** Helper: formatta secondi rimanenti. */
export function formatRemaining(endIso: string | null) {
  if (!endIso) return "—";
  const ms = new Date(endIso).getTime() - Date.now();
  if (ms <= 0) return "Pronto!";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}
