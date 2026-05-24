import { supabase } from "@/integrations/supabase/client";
import { addPikmin, spendPikmin } from "@/lib/pikmin";
import { grantIngredients } from "@/lib/ingredients";
import { addCoins } from "@/lib/coins";
import { collectShipPart } from "@/lib/ship";

export type Difficulty = "facile" | "normale" | "difficile" | "pericolosa" | "leggendaria";
export type Biome = "foresta" | "lago" | "urbana" | "industriale" | "caverna" | "rovine" | "serra";
export type Risk = "basso" | "medio" | "alto" | "estremo";
export type Result = "successo" | "parziale" | "fallito";

export interface MissionTemplate {
  key: string;
  title: string;
  description: string | null;
  biome: Biome;
  difficulty: Difficulty;
  duration_minutes: number;
  pikmin_min: number;
  pikmin_recommended: number;
  pikmin_max: number;
  recommended_types: string[];
  rewards_pool: {
    coins?: [number, number];
    ingredients?: string[];
    ship_parts?: boolean;
    xp?: [number, number];
  };
  events_pool: string[];
  sort_order: number;
}

export interface Expedition {
  id: string;
  created_by: string;
  is_coop: boolean;
  partner: string | null;
  status: "preparing" | "waiting_partner" | "active" | "completed" | "failed" | "cancelled";
  template_key: string;
  title: string;
  biome: Biome;
  difficulty: Difficulty;
  duration_minutes: number;
  power: number;
  success_chance: number;
  risk: Risk;
  started_at: string | null;
  end_at: string | null;
  resolved_at: string | null;
  rewards: Record<string, unknown>;
  events: ExpeditionEvent[];
  summary: string | null;
  result: Result | null;
  created_at: string;
}

export interface ExpeditionSquad {
  id: string;
  expedition_id: string;
  agent: string;
  pikmin_total: number;
  breakdown: Record<string, number>;
  confirmed: boolean;
  joined_at: string;
}

export interface ExpeditionEvent {
  kind: string;
  label: string;
  emoji: string;
  delta?: Record<string, number | string>;
}

export const BIOME_META: Record<Biome, { label: string; emoji: string; color: string; types: string[] }> = {
  foresta: { label: "Foresta", emoji: "🌳", color: "from-emerald-700/40 to-emerald-500/10", types: ["red", "purple"] },
  lago: { label: "Lago", emoji: "🌊", color: "from-sky-600/40 to-sky-400/10", types: ["blue"] },
  urbana: { label: "Zona Urbana", emoji: "🏙️", color: "from-yellow-600/40 to-yellow-400/10", types: ["yellow"] },
  industriale: { label: "Area Industriale", emoji: "⚙️", color: "from-orange-700/40 to-orange-500/10", types: ["yellow", "rock"] },
  caverna: { label: "Caverna", emoji: "🪨", color: "from-stone-700/50 to-stone-500/10", types: ["rock", "purple"] },
  rovine: { label: "Rovine", emoji: "🏛️", color: "from-amber-700/40 to-amber-500/10", types: ["white", "purple"] },
  serra: { label: "Serra Tropicale", emoji: "🌺", color: "from-pink-600/40 to-pink-400/10", types: ["wing", "red"] },
};

export const DIFFICULTY_META: Record<Difficulty, { label: string; color: string; mult: number }> = {
  facile: { label: "Facile", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", mult: 1.0 },
  normale: { label: "Normale", color: "bg-yellow-500/20 text-yellow-200 border-yellow-500/40", mult: 1.25 },
  difficile: { label: "Difficile", color: "bg-orange-500/20 text-orange-200 border-orange-500/40", mult: 1.6 },
  pericolosa: { label: "Pericolosa", color: "bg-rose-500/20 text-rose-200 border-rose-500/40", mult: 2.0 },
  leggendaria: { label: "Leggendaria", color: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40", mult: 2.6 },
};

export const RISK_META: Record<Risk, { label: string; color: string }> = {
  basso: { label: "Basso", color: "text-emerald-300" },
  medio: { label: "Medio", color: "text-yellow-300" },
  alto: { label: "Alto", color: "text-orange-300" },
  estremo: { label: "Estremo", color: "text-rose-300" },
};

const EVENT_LIBRARY: Record<string, { label: string; emoji: string }> = {
  tempesta: { label: "Tempesta improvvisa", emoji: "⛈️" },
  mostro: { label: "Mostro incontrato", emoji: "👾" },
  tesoro_raro: { label: "Tesoro raro!", emoji: "💎" },
  segnale_misterioso: { label: "Segnale misterioso", emoji: "📡" },
  spedizione_danneggiata: { label: "Spedizione danneggiata", emoji: "🩹" },
  creatura_amichevole: { label: "Creatura amichevole", emoji: "🐞" },
};

export const PARTNER_OF: Record<string, string> = { papa: "lorenzo", lorenzo: "papa" };

// ----- Calcoli potenza / successo -----
export interface PreviewInput {
  template: MissionTemplate;
  totalPikmin: number;
  breakdown: Record<string, number>;
  coopBonus: boolean;
}

export interface PreviewOutput {
  power: number;
  successChance: number;
  risk: Risk;
  speed: "lenta" | "stabile" | "veloce";
  recommendedMatchPct: number;
}

export function previewExpedition({ template, totalPikmin, breakdown, coopBonus }: PreviewInput): PreviewOutput {
  const min = template.pikmin_min;
  const rec = template.pikmin_recommended;
  const max = template.pikmin_max;
  const diffMult = DIFFICULTY_META[template.difficulty].mult;

  let power = Math.round(totalPikmin * 10);
  const recommendedSet = new Set(template.recommended_types);
  let matching = 0;
  let wrong = 0;
  for (const [type, count] of Object.entries(breakdown)) {
    if (recommendedSet.has(type)) matching += count;
    else wrong += count;
  }
  const matchPct = totalPikmin > 0 ? matching / totalPikmin : 0;
  const wrongPct = totalPikmin > 0 ? wrong / totalPikmin : 0;
  // bonus tipi giusti + PENALITA FORTE tipi sbagliati (fino a -60% potenza)
  power = Math.round(power * (1 + matchPct * 0.4) * (1 - wrongPct * 0.6));
  if (coopBonus) power = Math.round(power * 1.15);

  const required = Math.round(rec * 10 * diffMult);
  let chance = required > 0 ? power / required : 1;
  chance = chance * 0.85;
  // penalita aggiuntiva se sotto il minimo
  if (totalPikmin < min) {
    const deficit = min > 0 ? (min - totalPikmin) / min : 0;
    chance = chance * Math.max(0.2, 1 - deficit * 0.7);
  }
  // penalita extra forte per composizione completamente sbagliata
  if (wrongPct >= 0.8) chance = chance * 0.5;
  chance = Math.min(0.98, Math.max(0.03, chance));
  if (coopBonus) chance = Math.min(0.98, chance + 0.05);

  let speed: "lenta" | "stabile" | "veloce" = "stabile";
  if (totalPikmin < rec) speed = "lenta";
  else if (totalPikmin > rec + Math.ceil((max - rec) / 2)) speed = "veloce";

  let risk: Risk = "medio";
  if (totalPikmin < min) risk = "estremo";
  else if (totalPikmin < rec) risk = "alto";
  else if (totalPikmin >= rec) risk = diffMult >= 2 ? "alto" : diffMult >= 1.5 ? "medio" : "basso";
  if (wrongPct >= 0.5 && risk !== "estremo") risk = "alto";
  if (coopBonus && risk !== "estremo") {
    if (risk === "alto") risk = "medio";
    else if (risk === "medio") risk = "basso";
  }

  return { power, successChance: chance, risk, speed, recommendedMatchPct: matchPct };
}

export function effectiveDurationMinutes(template: MissionTemplate, totalPikmin: number, coopBonus: boolean) {
  const rec = template.pikmin_recommended;
  let factor = 1;
  if (totalPikmin < rec) factor = 1.25;
  else if (totalPikmin >= rec + 4) factor = 0.8;
  if (coopBonus) factor *= 0.9;
  return Math.max(1, Math.round(template.duration_minutes * factor));
}

// ----- API client -----

export async function fetchTemplates(): Promise<MissionTemplate[]> {
  const { data, error } = await supabase
    .from("mission_templates")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as MissionTemplate[];
}

export async function fetchExpeditions(): Promise<Expedition[]> {
  const { data, error } = await supabase
    .from("expeditions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Expedition[];
}

export async function fetchExpedition(id: string): Promise<{ exp: Expedition; squads: ExpeditionSquad[] } | null> {
  const [{ data: exp }, { data: squads }] = await Promise.all([
    supabase.from("expeditions").select("*").eq("id", id).maybeSingle(),
    supabase.from("expedition_squads").select("*").eq("expedition_id", id),
  ]);
  if (!exp) return null;
  return { exp: exp as unknown as Expedition, squads: (squads ?? []) as unknown as ExpeditionSquad[] };
}

export interface CreateExpeditionInput {
  template: MissionTemplate;
  agent: string;
  isCoop: boolean;
  totalPikmin: number;
  breakdown: Record<string, number>;
}

export async function createExpedition(input: CreateExpeditionInput): Promise<Expedition> {
  const { template, agent, isCoop, totalPikmin, breakdown } = input;
  if (totalPikmin < 1) {
    throw new Error("Devi inviare almeno 1 Pikmin.");
  }
  if (totalPikmin > template.pikmin_max) {
    throw new Error(`Massimo ${template.pikmin_max} Pikmin per questa missione.`);
  }
  const partner = isCoop ? PARTNER_OF[agent] ?? null : null;
  const preview = previewExpedition({ template, totalPikmin, breakdown, coopBonus: isCoop });
  const duration = effectiveDurationMinutes(template, totalPikmin, isCoop);

  // spendi pikmin del creatore
  await spendPikmin(totalPikmin, "expedition_send", agent, { template: template.key });

  const status = isCoop ? "waiting_partner" : "active";
  const startedAt = isCoop ? null : new Date().toISOString();
  const endAt = isCoop ? null : new Date(Date.now() + duration * 60_000).toISOString();

  const { data, error } = await supabase
    .from("expeditions")
    .insert({
      created_by: agent,
      is_coop: isCoop,
      partner,
      status,
      template_key: template.key,
      title: template.title,
      biome: template.biome,
      difficulty: template.difficulty,
      duration_minutes: duration,
      power: preview.power,
      success_chance: preview.successChance,
      risk: preview.risk,
      started_at: startedAt,
      end_at: endAt,
    })
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("expedition_squads").insert({
    expedition_id: data.id,
    agent,
    pikmin_total: totalPikmin,
    breakdown: breakdown as any,
    confirmed: true,
  });

  if (isCoop && partner) {
    await supabase.from("mission_notifications").insert({
      agent: partner,
      kind: "coop_invite",
      payload: { expedition_id: data.id, title: template.title, from: agent },
    });
  }

  return data as unknown as Expedition;
}

export async function joinExpedition(params: {
  expeditionId: string;
  agent: string;
  totalPikmin: number;
  breakdown: Record<string, number>;
}) {
  const { expeditionId, agent, totalPikmin, breakdown } = params;
  await spendPikmin(totalPikmin, "expedition_join", agent, { expedition_id: expeditionId });
  await supabase.from("expedition_squads").upsert(
    {
      expedition_id: expeditionId,
      agent,
      pikmin_total: totalPikmin,
      breakdown: breakdown as any,
      confirmed: true,
    },
    { onConflict: "expedition_id,agent" },
  );
  // ricalcola e avvia
  const detail = await fetchExpedition(expeditionId);
  if (!detail) return;
  const totals = detail.squads.reduce((acc, s) => acc + s.pikmin_total, 0);
  const merged: Record<string, number> = {};
  for (const s of detail.squads) {
    for (const [k, v] of Object.entries(s.breakdown ?? {})) merged[k] = (merged[k] ?? 0) + (v as number);
  }
  // recupero template
  const { data: tpl } = await supabase
    .from("mission_templates")
    .select("*")
    .eq("key", detail.exp.template_key)
    .single();
  const template = tpl as unknown as MissionTemplate;
  const preview = previewExpedition({ template, totalPikmin: totals, breakdown: merged, coopBonus: true });
  const duration = effectiveDurationMinutes(template, totals, true);
  const now = new Date();
  await supabase
    .from("expeditions")
    .update({
      status: "active",
      power: preview.power,
      success_chance: preview.successChance,
      risk: preview.risk,
      duration_minutes: duration,
      started_at: now.toISOString(),
      end_at: new Date(now.getTime() + duration * 60_000).toISOString(),
    })
    .eq("id", expeditionId);

  await supabase.from("mission_notifications").insert({
    agent: detail.exp.created_by,
    kind: "coop_joined",
    payload: { expedition_id: expeditionId, title: detail.exp.title, from: agent },
  });
}

export async function cancelExpedition(expeditionId: string) {
  const detail = await fetchExpedition(expeditionId);
  if (!detail) return;
  // restituisci pikmin
  for (const s of detail.squads) {
    if (s.pikmin_total > 0) {
      await addPikmin(s.pikmin_total, "expedition_cancel", s.agent, { expedition_id: expeditionId });
    }
  }
  await supabase
    .from("expeditions")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("id", expeditionId);
}

// ----- Risoluzione -----

function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pickN<T>(arr: T[], n: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(Math.random() * arr.length)]);
  return out;
}

export async function resolveExpedition(id: string) {
  // idempotente: prendi e blocca via status
  const detail = await fetchExpedition(id);
  if (!detail) return;
  const { exp, squads } = detail;
  if (exp.status === "completed" || exp.status === "failed" || exp.status === "cancelled") return;
  if (!exp.end_at) return;
  if (new Date(exp.end_at).getTime() > Date.now()) return;

  const { data: tpl } = await supabase
    .from("mission_templates")
    .select("*")
    .eq("key", exp.template_key)
    .single();
  const template = tpl as unknown as MissionTemplate;
  const pool = template.rewards_pool ?? {};

  const roll = Math.random();
  let result: Result;
  if (roll < exp.success_chance) result = "successo";
  else if (roll < exp.success_chance + 0.15) result = "parziale";
  else result = "fallito";

  const events: ExpeditionEvent[] = [];
  const eventsCount = result === "successo" ? rand(2, 4) : result === "parziale" ? rand(2, 3) : rand(1, 2);
  const picks = pickN(template.events_pool ?? [], eventsCount);
  for (const k of picks) {
    const meta = EVENT_LIBRARY[k] ?? { label: k, emoji: "✨" };
    events.push({ kind: k, label: meta.label, emoji: meta.emoji });
  }

  // ricompense
  const rewards: { coins: number; xp: number; ingredients: string[]; ship_part?: string } = {
    coins: 0,
    xp: 0,
    ingredients: [],
  };
  if (result !== "fallito") {
    const factor = result === "successo" ? 1 : 0.5;
    if (pool.coins) rewards.coins = Math.round(rand(pool.coins[0], pool.coins[1]) * factor);
    if (pool.xp) rewards.xp = Math.round(rand(pool.xp[0], pool.xp[1]) * factor);
    if (pool.ingredients?.length) {
      const n = result === "successo" ? rand(2, 4) : 1;
      rewards.ingredients = pickN(pool.ingredients, n);
    }
    if (pool.ship_parts && result === "successo" && Math.random() < 0.4) {
      const { data: parts } = await supabase
        .from("ship_parts")
        .select("key")
        .order("sort_order");
      const collected = await supabase.from("ship_parts_collected").select("part_key");
      const taken = new Set((collected.data ?? []).map((c) => c.part_key));
      const available = (parts ?? []).map((p) => p.key).filter((k) => !taken.has(k));
      if (available.length) {
        rewards.ship_part = available[Math.floor(Math.random() * available.length)];
      }
    }
  }

  // pikmin persi
  const lossRate = result === "successo" ? 0.05 : result === "parziale" ? 0.2 : 0.5;
  const totalSent = squads.reduce((a, s) => a + s.pikmin_total, 0);

  // applica
  for (const s of squads) {
    const lost = Math.floor(s.pikmin_total * lossRate);
    const back = s.pikmin_total - lost;
    if (back > 0) {
      await addPikmin(back, "expedition_return", s.agent, { expedition_id: id, lost });
    }
  }
  // divido i premi tra gli agenti partecipanti
  const agents = Array.from(new Set(squads.map((s) => s.agent)));
  for (const ag of agents) {
    if (rewards.coins > 0) {
      await addCoins(ag, Math.ceil(rewards.coins / agents.length), "expedition_reward", { expedition_id: id });
    }
    if (rewards.ingredients.length) {
      const slice = rewards.ingredients.filter((_, i) => i % agents.length === agents.indexOf(ag));
      if (slice.length) await grantIngredients(ag, slice);
    }
  }
  if (rewards.ship_part) {
    try {
      await collectShipPart({
        partKey: rewards.ship_part,
        collectedBy: agents[0],
        source: "drop",
      });
    } catch {}
  }

  const summary =
    result === "successo"
      ? `Spedizione completata con successo! ${totalSent} Pikmin inviati.`
      : result === "parziale"
        ? `Spedizione conclusa parzialmente. Alcuni Pikmin sono tornati a mani vuote.`
        : `Spedizione fallita. Molti Pikmin persi nel tentativo.`;

  await supabase
    .from("expeditions")
    .update({
      status: result === "fallito" ? "failed" : "completed",
      resolved_at: new Date().toISOString(),
      rewards: rewards as any,
      events: events as any,
      summary,
      result,
    })
    .eq("id", id);

  // notifiche
  for (const ag of agents) {
    await supabase.from("mission_notifications").insert({
      agent: ag,
      kind: "expedition_resolved",
      payload: { expedition_id: id, title: exp.title, result },
    });
  }
}

export async function fetchNotifications(agent: string) {
  const { data } = await supabase
    .from("mission_notifications")
    .select("*")
    .eq("agent", agent)
    .is("read_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as Array<{
    id: string;
    kind: string;
    payload: Record<string, any>;
    created_at: string;
  }>;
}

export async function markNotificationRead(id: string) {
  await supabase.from("mission_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}
