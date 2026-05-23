import { supabase } from "@/integrations/supabase/client";
import { addCoins, spendCoins } from "@/lib/coins";
import { consumeIngredient, grantIngredients } from "@/lib/ingredients";
import { addPikmin, spendPikmin } from "@/lib/pikmin";

export interface TradeBundle {
  coins?: number;
  pikmin?: number;
  ingredients?: string[]; // chiavi (con ripetizioni = più copie)
}

export interface TradeOffer {
  id: string;
  from_agent: string;
  to_agent: string;
  offer: TradeBundle;
  request: TradeBundle;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  created_at: string;
  resolved_at: string | null;
  expires_at: string;
}

/** Restituisce il livello dell'Ambasciata dell'agente (0 = non costruita). */
export async function getAmbasciataLevel(agent: string): Promise<number> {
  const { data } = await supabase
    .from("base_buildings")
    .select("level,status")
    .eq("agent", agent)
    .eq("type", "ambasciata")
    .maybeSingle();
  if (!data) return 0;
  // costruzione iniziale: status=building, level=0 — non ancora attiva
  return data.status === "idle" ? (data.level as number) : 0;
}

/** Quanti scambi pendenti può avere contemporaneamente in uscita. */
export function maxOpenSlots(level: number) {
  return Math.max(1, level); // ogni livello = 1 slot
}

export async function listMyOffers(agent: string): Promise<TradeOffer[]> {
  const { data } = await supabase
    .from("trade_offers")
    .select("*")
    .or(`from_agent.eq.${agent},to_agent.eq.${agent}`)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as unknown as TradeOffer[];
}

function bundleEmpty(b: TradeBundle) {
  return !b.coins && !b.pikmin && !(b.ingredients && b.ingredients.length);
}

export async function createOffer(params: {
  from: string;
  to: string;
  offer: TradeBundle;
  request: TradeBundle;
  message?: string;
}) {
  if (bundleEmpty(params.offer) || bundleEmpty(params.request)) {
    throw new Error("Sia l'offerta che la richiesta devono contenere qualcosa.");
  }
  const lvl = await getAmbasciataLevel(params.from);
  if (lvl < 1) throw new Error("Costruisci l'Ambasciata per inviare scambi.");

  // Slot disponibili
  const { count } = await supabase
    .from("trade_offers")
    .select("id", { count: "exact", head: true })
    .eq("from_agent", params.from)
    .eq("status", "pending");
  if ((count ?? 0) >= maxOpenSlots(lvl)) {
    throw new Error(`Hai esaurito gli slot scambio (${maxOpenSlots(lvl)}). Evolvi l'Ambasciata.`);
  }

  // Verifica risorse del mittente (escrow leggero: spende subito)
  if (params.offer.coins && params.offer.coins > 0) {
    const ok = await spendCoins(params.from, params.offer.coins, "trade_escrow", { to: params.to });
    if (!ok) throw new Error("Monete insufficienti.");
  }
  if (params.offer.pikmin && params.offer.pikmin > 0) {
    try {
      await spendPikmin(params.offer.pikmin, "trade_escrow", params.from, { to: params.to });
    } catch (e: any) {
      // rollback monete
      if (params.offer.coins) await addCoins(params.from, params.offer.coins, "trade_rollback");
      throw e;
    }
  }
  if (params.offer.ingredients?.length) {
    for (const k of params.offer.ingredients) {
      const c = await consumeIngredient(params.from, k);
      if (!c) throw new Error(`Manca ingrediente ${k}.`);
    }
  }

  const { data, error } = await supabase
    .from("trade_offers")
    .insert({
      from_agent: params.from,
      to_agent: params.to,
      offer: params.offer as unknown as Record<string, unknown>,
      request: params.request as unknown as Record<string, unknown>,
      message: params.message ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("mission_notifications").insert({
    agent: params.to,
    kind: "trade_offer",
    payload: { from: params.from, id: data.id },
  });
  return data as unknown as TradeOffer;
}

/** Annulla offerta (solo dal mittente) e restituisce le risorse. */
export async function cancelOffer(agent: string, t: TradeOffer) {
  if (t.from_agent !== agent || t.status !== "pending") return;
  await refundOffer(t);
  await supabase
    .from("trade_offers")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("id", t.id);
}

async function refundOffer(t: TradeOffer) {
  if (t.offer.coins) await addCoins(t.from_agent, t.offer.coins, "trade_refund", { id: t.id });
  if (t.offer.pikmin) await addPikmin(t.offer.pikmin, "trade_refund", t.from_agent, { id: t.id });
  if (t.offer.ingredients?.length) await grantIngredients(t.from_agent, t.offer.ingredients);
}

/** Il destinatario accetta: paga la "request" e riceve l'"offer". */
export async function acceptOffer(agent: string, t: TradeOffer) {
  if (t.to_agent !== agent || t.status !== "pending") throw new Error("Offerta non più valida.");

  // Verifica che il destinatario possa pagare quanto richiesto
  if (t.request.coins && t.request.coins > 0) {
    const ok = await spendCoins(agent, t.request.coins, "trade_pay", { id: t.id });
    if (!ok) throw new Error("Non hai abbastanza monete.");
  }
  if (t.request.pikmin && t.request.pikmin > 0) {
    try {
      await spendPikmin(t.request.pikmin, "trade_pay", agent, { id: t.id });
    } catch (e: any) {
      if (t.request.coins) await addCoins(agent, t.request.coins, "trade_rollback");
      throw e;
    }
  }
  if (t.request.ingredients?.length) {
    for (const k of t.request.ingredients) {
      const c = await consumeIngredient(agent, k);
      if (!c) {
        // rollback
        if (t.request.coins) await addCoins(agent, t.request.coins, "trade_rollback");
        if (t.request.pikmin) await addPikmin(t.request.pikmin, "trade_rollback", agent);
        throw new Error(`Non hai ${k}.`);
      }
    }
  }

  // Trasferisci: destinatario riceve offer, mittente riceve request
  if (t.offer.coins) await addCoins(agent, t.offer.coins, "trade_receive", { id: t.id });
  if (t.offer.pikmin) await addPikmin(t.offer.pikmin, "trade_receive", agent, { id: t.id });
  if (t.offer.ingredients?.length) await grantIngredients(agent, t.offer.ingredients);

  if (t.request.coins) await addCoins(t.from_agent, t.request.coins, "trade_receive", { id: t.id });
  if (t.request.pikmin) await addPikmin(t.request.pikmin, "trade_receive", t.from_agent, { id: t.id });
  if (t.request.ingredients?.length) await grantIngredients(t.from_agent, t.request.ingredients);

  await supabase
    .from("trade_offers")
    .update({ status: "accepted", resolved_at: new Date().toISOString() })
    .eq("id", t.id);

  await supabase.from("mission_notifications").insert({
    agent: t.from_agent,
    kind: "trade_accepted",
    payload: { from: agent, id: t.id },
  });
}

export async function declineOffer(agent: string, t: TradeOffer) {
  if (t.to_agent !== agent || t.status !== "pending") return;
  await refundOffer(t); // restituisce al mittente quanto messo in escrow
  await supabase
    .from("trade_offers")
    .update({ status: "declined", resolved_at: new Date().toISOString() })
    .eq("id", t.id);
  await supabase.from("mission_notifications").insert({
    agent: t.from_agent,
    kind: "trade_declined",
    payload: { from: agent, id: t.id },
  });
}

export function bundleLabel(b: TradeBundle): string {
  const parts: string[] = [];
  if (b.coins) parts.push(`💰 ${b.coins}`);
  if (b.pikmin) parts.push(`🌱 ${b.pikmin}`);
  if (b.ingredients?.length) {
    const counts: Record<string, number> = {};
    b.ingredients.forEach((k) => (counts[k] = (counts[k] ?? 0) + 1));
    parts.push(
      Object.entries(counts)
        .map(([k, n]) => `🍃${k}${n > 1 ? `×${n}` : ""}`)
        .join(" "),
    );
  }
  return parts.join(" · ") || "—";
}
