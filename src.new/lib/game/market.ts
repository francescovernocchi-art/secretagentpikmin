import { payPlanetDebt } from "@/lib/game/planet";
import { fetchInventory, removeInventoryQuantity } from "@/lib/game/inventory";
import { gameTable } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import { addXpToAvailableSquad, XP_AMOUNTS } from "@/lib/game/pikmin-xp";
import { pushGameNotification } from "@/lib/game/notifications";
import type { DbInventoryItem, DbMarketTransaction } from "@/types/phase2-db";

export async function sellInventoryItem(
  agentKey: string,
  itemKey: string,
  quantity = 1,
): Promise<{ success: boolean; credits: number; message: string }> {
  const { data: items } = await fetchInventory(agentKey);
  const item = items.find((i) => i.item_key === itemKey);
  if (!item || item.quantity < quantity) {
    return { success: false, credits: 0, message: "Quantità insufficiente" };
  }

  const total = item.sell_price * quantity;
  const ok = await removeInventoryQuantity(agentKey, itemKey, quantity);
  if (!ok) return { success: false, credits: 0, message: "Errore inventario" };

  await payPlanetDebt(total);

  const tx: DbMarketTransaction = {
    id: crypto.randomUUID(),
    agent_key: agentKey,
    item_key: itemKey,
    item_name: item.item_name,
    quantity,
    price: total,
    transaction_type: "sell",
    created_at: new Date().toISOString(),
  };

  try {
    await gameTable("market_transactions").insert({
      agent_key: tx.agent_key,
      item_key: tx.item_key,
      item_name: tx.item_name,
      quantity: tx.quantity,
      price: tx.price,
      transaction_type: tx.transaction_type,
    });
    await gameTable("player_profiles")
      .update({ coins: (await getProfileCoins(agentKey)) + total })
      .eq("agent_key", agentKey);
  } catch {
    localStore.addTransaction(tx);
  }

  await addXpToAvailableSquad(agentKey, XP_AMOUNTS.vendita, "vendita", 2);

  await pushGameNotification({
    agentKey,
    kind: "debt_reduced",
    title: "Debito planetario ridotto",
    body: `+${total} cr versati`,
    payload: { amount: total, item_key: itemKey },
  });

  return { success: true, credits: total, message: `Venduto per ${total} cr — debito planetario ridotto` };
}

async function getProfileCoins(agentKey: string): Promise<number> {
  try {
    const { data } = await gameTable("player_profiles").select("coins").eq("agent_key", agentKey).maybeSingle();
    return data?.coins ?? 0;
  } catch {
    return 0;
  }
}

export type SellableItem = DbInventoryItem & { sellerLabel: string };

export async function fetchSellableInventory(agentKey: string): Promise<SellableItem[]> {
  const { data } = await fetchInventory(agentKey);
  const label = agentKey === "papa" ? "Francesco" : "Lorenzo";
  return data.filter((i) => i.quantity > 0 && i.sell_price > 0).map((i) => ({ ...i, sellerLabel: label }));
}

export async function fetchRecentTransactions(agentKey: string, limit = 10) {
  try {
    const { data, error } = await gameTable("market_transactions")
      .select("*")
      .eq("agent_key", agentKey)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as DbMarketTransaction[];
  } catch {
    return localStore.getTransactions(agentKey).slice(0, limit);
  }
}
