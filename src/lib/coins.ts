import { supabase } from "@/integrations/supabase/client";

export async function getCoins(agent: string): Promise<number> {
  const { data } = await supabase
    .from("agent_coins")
    .select("coins")
    .eq("agent", agent)
    .maybeSingle();
  return data?.coins ?? 0;
}

export async function addCoins(agent: string, amount: number, reason: string, meta?: Record<string, unknown>) {
  if (!amount) return;
  const current = await getCoins(agent);
  const next = Math.max(0, current + amount);
  const { data: existing } = await supabase
    .from("agent_coins")
    .select("agent")
    .eq("agent", agent)
    .maybeSingle();
  if (existing) {
    await supabase.from("agent_coins").update({ coins: next, updated_at: new Date().toISOString() }).eq("agent", agent);
  } else {
    await supabase.from("agent_coins").insert({ agent, coins: next });
  }
  await supabase.from("coin_transactions").insert({ agent, amount, reason, meta: meta ?? null });
}

/** Spende monete; ritorna true se è andata a buon fine. */
export async function spendCoins(agent: string, cost: number, reason: string, meta?: Record<string, unknown>) {
  const current = await getCoins(agent);
  if (current < cost) return false;
  await addCoins(agent, -cost, reason, meta);
  return true;
}
