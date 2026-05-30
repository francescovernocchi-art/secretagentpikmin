import { agentKeyFromSession, gameTable, safeGameQuery, isSupabaseConfigured } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import type { DbPlanetStatus, MissionProgressData } from "@/types/phase2-db";

export async function fetchPlanetStatus(): Promise<{ data: DbPlanetStatus; source: "supabase" | "local" }> {
  return safeGameQuery(
    () => gameTable("planet_status").select("*").eq("id", "origin").maybeSingle(),
    () => localStore.getPlanet(),
  );
}

export async function payPlanetDebt(amount: number): Promise<{ data: DbPlanetStatus; source: "supabase" | "local" }> {
  return withFallbackPay(amount);
}

async function withFallbackPay(amount: number) {
  const { data: current, source } = await fetchPlanetStatus();
  const debtRemaining = current.debt_total - current.debt_paid;
  const pay = Math.min(amount, debtRemaining);
  const updated = {
    ...current,
    debt_paid: current.debt_paid + pay,
    updated_at: new Date().toISOString(),
  };

  if (source === "local") {
    localStore.setPlanet(updated);
    return { data: updated, source: "local" as const };
  }

  try {
    const { data, error } = await gameTable("planet_status")
      .update({ debt_paid: updated.debt_paid, updated_at: updated.updated_at })
      .eq("id", "origin")
      .select("*")
      .single();
    if (error) throw error;
    return { data: data as DbPlanetStatus, source: "supabase" as const };
  } catch {
    localStore.setPlanet(updated);
    return { data: updated, source: "local" as const };
  }
}

export async function fetchMissionProgress(): Promise<{ data: MissionProgressData; source: "supabase" | "local" }> {
  const [planetRes, partsRes] = await Promise.all([fetchPlanetStatus(), import("@/lib/game/spaceship").then((m) => m.fetchSpaceshipParts())]);

  let bestiaryCount = planetRes.data.bestiary_count;
  if (isSupabaseConfigured()) {
    try {
      const { count } = await gameTable("bestiary_entries").select("*", { count: "exact", head: true });
      if (typeof count === "number") bestiaryCount = count;
    } catch {
      bestiaryCount = localStore.getBestiary().length;
    }
  } else {
    bestiaryCount = localStore.getBestiary().length;
  }

  const parts = partsRes.data;
  return {
    data: {
      shipCollected: parts.filter((p) => p.collected).length,
      shipTotal: parts.length,
      debtPaid: planetRes.data.debt_paid,
      debtTotal: planetRes.data.debt_total,
      food: planetRes.data.food,
      energy: planetRes.data.energy,
      morale: planetRes.data.morale,
      bestiaryCount,
      bestiaryTotal: planetRes.data.bestiary_total,
    },
    source: planetRes.source,
  };
}

export async function addPlanetResources(delta: {
  food?: number;
  energy?: number;
  morale?: number;
}): Promise<{ data: DbPlanetStatus; source: "supabase" | "local" }> {
  const { data: current, source } = await fetchPlanetStatus();
  const updated = {
    ...current,
    food: Math.min(100, Math.max(0, current.food + (delta.food ?? 0))),
    energy: Math.min(100, Math.max(0, current.energy + (delta.energy ?? 0))),
    morale: Math.min(100, Math.max(0, current.morale + (delta.morale ?? 0))),
  };

  if (source === "local") {
    localStore.setPlanet(updated);
    return { data: updated, source: "local" };
  }

  try {
    const { data, error } = await gameTable("planet_status")
      .update({ food: updated.food, energy: updated.energy, morale: updated.morale })
      .eq("id", "origin")
      .select("*")
      .single();
    if (error) throw error;
    return { data: data as DbPlanetStatus, source: "supabase" };
  } catch {
    localStore.setPlanet(updated);
    return { data: updated, source: "local" };
  }
}

export function displayAgentName(agentKey: string): string {
  if (agentKey === "papa") return "Francesco";
  if (agentKey === "lorenzo") return "Lorenzo";
  return agentKey;
}

export { agentKeyFromSession };
