import { supabase } from "@/integrations/supabase/client";

/** Costo in pikmin per recuperare un pezzo navicella in base alla rarità. */
export const PIKMIN_COST_BY_RARITY: Record<string, number> = {
  comune: 3,
  raro: 10,
  leggendario: 25,
};

export const RARITY_LABEL: Record<string, string> = {
  comune: "Comune",
  raro: "Raro",
  leggendario: "Leggendario",
};

export const RARITY_COLOR: Record<string, string> = {
  comune: "text-muted-foreground",
  raro: "text-sky-300",
  leggendario: "text-amber-300",
};

export function pikminCostFor(rarity: string | null | undefined): number {
  return PIKMIN_COST_BY_RARITY[rarity ?? "comune"] ?? PIKMIN_COST_BY_RARITY.comune;
}

/** Aggiunge pikmin al contatore della squadra. */
export async function addPikmin(amount: number, reason: string, agent: string, meta?: Record<string, unknown>) {
  if (amount <= 0) return;
  const { data, error } = await supabase.rpc("adjust_pikmin", {
    p_delta: amount,
    p_reason: reason,
    p_agent: agent,
    p_meta: meta ?? null,
  });
  if (error) throw error;
  return data as number;
}

/** Spende pikmin dal contatore. Lancia eccezione se non bastano. */
export async function spendPikmin(amount: number, reason: string, agent: string, meta?: Record<string, unknown>) {
  if (amount <= 0) return;
  const { data, error } = await supabase.rpc("adjust_pikmin", {
    p_delta: -amount,
    p_reason: reason,
    p_agent: agent,
    p_meta: meta ?? null,
  });
  if (error) throw error;
  return data as number;
}

export async function getPikminCount(): Promise<number> {
  const { data } = await supabase
    .from("pikmin_squad")
    .select("count")
    .eq("id", "team")
    .maybeSingle();
  return (data?.count as number) ?? 0;
}
