import { supabase } from "@/integrations/supabase/client";

const POOLS: Record<string, string[]> = {
  mission: ["seed_red", "seed_yellow", "seed_blue", "water", "leaf", "honey", "star_dust", "sun_energy"],
  radar: ["seed_white", "rock_frag", "mushroom", "spark"],
};

/** Restituisce 1-2 chiavi ingrediente casuali dalla pool indicata. */
export function rollIngredients(source: "mission" | "radar"): string[] {
  const pool = POOLS[source];
  const count = Math.random() < 0.25 ? 2 : 1;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return out;
}

/** Aggiunge ingredienti all'inventario tramite upsert + somma quantità. */
export async function grantIngredients(agent: string, keys: string[]) {
  for (const key of keys) {
    // Cerca riga esistente
    const { data: existing } = await supabase
      .from("inventory")
      .select("id, qty")
      .eq("agent", agent)
      .eq("ingredient_key", key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("inventory")
        .update({ qty: existing.qty + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("inventory").insert({ agent, ingredient_key: key, qty: 1 });
    }
  }
}

/** Decrementa di 1 (o elimina se 0) un ingrediente. */
export async function consumeIngredient(agent: string, key: string) {
  const { data } = await supabase
    .from("inventory")
    .select("id, qty")
    .eq("agent", agent)
    .eq("ingredient_key", key)
    .maybeSingle();
  if (!data) return false;
  if (data.qty <= 1) {
    await supabase.from("inventory").delete().eq("id", data.id);
  } else {
    await supabase.from("inventory").update({ qty: data.qty - 1 }).eq("id", data.id);
  }
  return true;
}
