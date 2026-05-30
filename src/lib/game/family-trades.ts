import { gameTable, isSupabaseConfigured } from "@/lib/game/db";
import { fetchInventory, removeInventoryQuantity, addInventoryItem } from "@/lib/game/inventory";
import { localStore } from "@/lib/game/local-store";
import { sendChatMessage } from "@/lib/game/chat";
import { pushGameNotification } from "@/lib/game/notifications";
import { displayAgentName } from "@/lib/game/planet";
import type {
  DbFamilyTradeHistory,
  DbFamilyTradeItem,
  DbFamilyTradeOffer,
  FamilyTradeOfferFull,
  FamilyTradeStatus,
} from "@/types/phase4-db";

const OTHER_AGENT: Record<string, string> = { papa: "lorenzo", lorenzo: "papa" };

async function recordHistory(
  offer: DbFamilyTradeOffer,
  action: string,
  snapshot: Record<string, unknown> = {},
) {
  const row: DbFamilyTradeHistory = {
    id: crypto.randomUUID(),
    offer_id: offer.id,
    from_agent: offer.from_agent,
    to_agent: offer.to_agent,
    action,
    snapshot,
    created_at: new Date().toISOString(),
  };
  try {
    if (isSupabaseConfigured()) {
      await gameTable("family_trade_history").insert({
        offer_id: row.offer_id,
        from_agent: row.from_agent,
        to_agent: row.to_agent,
        action: row.action,
        snapshot: row.snapshot,
      });
    }
  } catch {}
  localStore.addTradeHistory(row);
}

async function loadOfferItems(offerId: string): Promise<DbFamilyTradeItem[]> {
  try {
    if (isSupabaseConfigured()) {
      const { data } = await gameTable("family_trade_items").select("*").eq("offer_id", offerId);
      return (data ?? []) as DbFamilyTradeItem[];
    }
  } catch {}
  return localStore.getTradeItems(offerId);
}

async function saveOffer(offer: DbFamilyTradeOffer, items: DbFamilyTradeItem[]): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      const { data: existing } = await gameTable("family_trade_offers").select("id").eq("id", offer.id).maybeSingle();
      if (existing) {
        await gameTable("family_trade_offers").update({
          status: offer.status,
          message: offer.message,
          updated_at: offer.updated_at,
          resolved_at: offer.resolved_at,
        }).eq("id", offer.id);
      } else {
        await gameTable("family_trade_offers").insert({
          id: offer.id,
          from_agent: offer.from_agent,
          to_agent: offer.to_agent,
          status: offer.status,
          message: offer.message,
        });
        for (const item of items) {
          await gameTable("family_trade_items").insert({
            offer_id: item.offer_id,
            side: item.side,
            agent_key: item.agent_key,
            item_key: item.item_key,
            item_name: item.item_name,
            emoji: item.emoji,
            category: item.category,
            quantity: item.quantity,
            sell_price: item.sell_price,
          });
        }
      }
    }
  } catch {}
  localStore.upsertTradeOffer(offer, items);
}

async function validateInventory(agentKey: string, items: DbFamilyTradeItem[]): Promise<boolean> {
  const { data: inv } = await fetchInventory(agentKey);
  for (const item of items) {
    const row = inv.find((i) => i.item_key === item.item_key);
    if (!row || row.quantity < item.quantity) return false;
  }
  return true;
}

async function transferItems(fromAgent: string, toAgent: string, items: DbFamilyTradeItem[]): Promise<void> {
  for (const item of items) {
    const ok = await removeInventoryQuantity(fromAgent, item.item_key, item.quantity);
    if (!ok) throw new Error(`Inventario insufficiente: ${item.item_name}`);
    await addInventoryItem({
      agentKey: toAgent,
      itemKey: item.item_key,
      itemName: item.item_name,
      emoji: item.emoji,
      category: item.category as "oggetto" | "materiale" | "ingrediente",
      quantity: item.quantity,
      sellPrice: item.sell_price,
    });
  }
}

export async function createFamilyTradeOffer(opts: {
  fromAgent: string;
  toAgent?: string;
  message?: string;
  offerItems: Array<{ item_key: string; item_name: string; emoji: string; category: string; quantity: number; sell_price: number }>;
  requestItems?: Array<{ item_key: string; item_name: string; emoji: string; category: string; quantity: number; sell_price: number }>;
}): Promise<{ success: boolean; offer?: FamilyTradeOfferFull; message: string }> {
  const toAgent = opts.toAgent ?? OTHER_AGENT[opts.fromAgent] ?? "lorenzo";
  if (opts.offerItems.length === 0) return { success: false, message: "Aggiungi almeno un oggetto da offrire" };

  const offerSide: DbFamilyTradeItem[] = opts.offerItems.map((i) => ({
    id: crypto.randomUUID(),
    offer_id: "",
    side: "offer",
    agent_key: opts.fromAgent,
    ...i,
  }));

  const requestSide: DbFamilyTradeItem[] = (opts.requestItems ?? []).map((i) => ({
    id: crypto.randomUUID(),
    offer_id: "",
    side: "request",
    agent_key: toAgent,
    ...i,
  }));

  const allFrom = offerSide;
  const valid = await validateInventory(opts.fromAgent, allFrom);
  if (!valid) return { success: false, message: "Quantità insufficiente nel tuo inventario" };

  const offer: DbFamilyTradeOffer = {
    id: crypto.randomUUID(),
    from_agent: opts.fromAgent,
    to_agent: toAgent,
    status: "pending",
    message: opts.message ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    resolved_at: null,
  };

  const items = [...offerSide, ...requestSide].map((i) => ({ ...i, offer_id: offer.id }));
  await saveOffer(offer, items);
  await recordHistory(offer, "created", { items });

  const fromName = displayAgentName(opts.fromAgent);
  await sendChatMessage({
    channel: "famiglia",
    senderAgent: opts.fromAgent,
    content: `📦 ${fromName} propone uno scambio: ${offerSide.map((i) => `${i.emoji} ${i.item_name} x${i.quantity}`).join(", ")}${requestSide.length ? ` → chiede ${requestSide.map((i) => `${i.emoji} ${i.item_name}`).join(", ")}` : ""}`,
    messageType: "trade",
  });

  await pushGameNotification({
    agentKey: toAgent,
    kind: "trade_received",
    title: "Nuovo scambio ricevuto",
    body: `${fromName} ti ha inviato una proposta di scambio`,
    payload: { offer_id: offer.id },
  });

  return { success: true, offer: { ...offer, items }, message: "Scambio inviato" };
}

export async function acceptFamilyTrade(offerId: string, acceptingAgent: string): Promise<{ success: boolean; message: string }> {
  const offer = localStore.getTradeOffer(offerId) ?? (await fetchTradeOfferById(offerId));
  if (!offer) return { success: false, message: "Scambio non trovato" };
  if (offer.to_agent !== acceptingAgent) return { success: false, message: "Non sei il destinatario" };
  if (offer.status !== "pending") return { success: false, message: "Scambio non più valido" };

  const items = offer.items.length ? offer.items : await loadOfferItems(offerId);
  const offerItems = items.filter((i) => i.side === "offer");
  const requestItems = items.filter((i) => i.side === "request");

  if (!(await validateInventory(offer.from_agent, offerItems))) {
    return { success: false, message: "Il mittente non ha più gli oggetti offerti" };
  }
  if (requestItems.length && !(await validateInventory(offer.to_agent, requestItems))) {
    return { success: false, message: "Non hai gli oggetti richiesti" };
  }

  await transferItems(offer.from_agent, offer.to_agent, offerItems);
  if (requestItems.length) {
    await transferItems(offer.to_agent, offer.from_agent, requestItems);
  }

  const updated: DbFamilyTradeOffer = {
    ...offer,
    status: "completed",
    updated_at: new Date().toISOString(),
    resolved_at: new Date().toISOString(),
  };
  await saveOffer(updated, items);
  await recordHistory(updated, "accepted", { items });

  await sendChatMessage({
    channel: "famiglia",
    senderAgent: acceptingAgent,
    content: `✅ ${displayAgentName(acceptingAgent)} ha accettato lo scambio con ${displayAgentName(offer.from_agent)}`,
    messageType: "trade",
  });

  await pushGameNotification({
    agentKey: offer.from_agent,
    kind: "trade_accepted",
    title: "Scambio completato",
    body: `${displayAgentName(acceptingAgent)} ha accettato la tua proposta`,
    payload: { offer_id: offerId },
  });

  // Market transaction log
  try {
    if (isSupabaseConfigured()) {
      for (const item of offerItems) {
        await gameTable("market_transactions").insert({
          agent_key: offer.from_agent,
          item_key: item.item_key,
          item_name: item.item_name,
          quantity: item.quantity,
          price: 0,
          transaction_type: "family_trade_out",
        });
        await gameTable("market_transactions").insert({
          agent_key: offer.to_agent,
          item_key: item.item_key,
          item_name: item.item_name,
          quantity: item.quantity,
          price: 0,
          transaction_type: "family_trade_in",
        });
      }
    }
  } catch {}

  return { success: true, message: "Scambio completato!" };
}

export async function rejectFamilyTrade(offerId: string, agentKey: string): Promise<{ success: boolean; message: string }> {
  const offer = localStore.getTradeOffer(offerId) ?? (await fetchTradeOfferById(offerId));
  if (!offer) return { success: false, message: "Scambio non trovato" };
  if (offer.to_agent !== agentKey && offer.from_agent !== agentKey) return { success: false, message: "Non autorizzato" };

  const status: FamilyTradeStatus = agentKey === offer.to_agent ? "rejected" : "cancelled";
  const updated = { ...offer, status, updated_at: new Date().toISOString(), resolved_at: new Date().toISOString() };
  await saveOffer(updated, offer.items);
  await recordHistory(updated, status, {});

  await sendChatMessage({
    channel: "famiglia",
    senderAgent: agentKey,
    content: `❌ Scambio ${status === "rejected" ? "rifiutato" : "annullato"} da ${displayAgentName(agentKey)}`,
    messageType: "trade",
  });

  if (agentKey === offer.to_agent) {
    await pushGameNotification({
      agentKey: offer.from_agent,
      kind: "trade_rejected",
      title: "Scambio rifiutato",
      body: `${displayAgentName(agentKey)} ha rifiutato la proposta`,
      payload: { offer_id: offerId },
    });
  }

  return { success: true, message: status === "rejected" ? "Scambio rifiutato" : "Scambio annullato" };
}

async function fetchTradeOfferById(id: string): Promise<FamilyTradeOfferFull | null> {
  try {
    if (isSupabaseConfigured()) {
      const { data: offer } = await gameTable("family_trade_offers").select("*").eq("id", id).maybeSingle();
      if (!offer) return null;
      const items = await loadOfferItems(id);
      return { ...(offer as DbFamilyTradeOffer), items };
    }
  } catch {}
  return localStore.getTradeOffer(id);
}

export async function fetchFamilyTrades(agentKey: string): Promise<{
  incoming: FamilyTradeOfferFull[];
  outgoing: FamilyTradeOfferFull[];
  history: DbFamilyTradeHistory[];
}> {
  let offers: FamilyTradeOfferFull[] = [];
  try {
    if (isSupabaseConfigured()) {
      const { data } = await gameTable("family_trade_offers")
        .select("*")
        .or(`from_agent.eq.${agentKey},to_agent.eq.${agentKey}`)
        .order("created_at", { ascending: false })
        .limit(30);
      for (const o of data ?? []) {
        const items = await loadOfferItems(o.id);
        offers.push({ ...(o as DbFamilyTradeOffer), items });
      }
    }
  } catch {}

  if (!offers.length) offers = localStore.getAllTradeOffers(agentKey);

  const incoming = offers.filter((o) => o.to_agent === agentKey && (o.status === "pending" || o.status === "draft"));
  const outgoing = offers.filter((o) => o.from_agent === agentKey && o.status === "pending");
  const history = localStore.getTradeHistory(agentKey);

  return { incoming, outgoing, history };
}

export function getPartnerAgent(agentKey: string): string {
  return OTHER_AGENT[agentKey] ?? "lorenzo";
}
