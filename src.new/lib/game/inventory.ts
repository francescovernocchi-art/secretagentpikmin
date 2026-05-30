import { gameTable, safeGameQuery } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import type { DbInventoryItem } from "@/types/phase2-db";

export async function fetchInventory(agentKey: string): Promise<{ data: DbInventoryItem[]; source: "supabase" | "local" }> {
  return safeGameQuery(
    () => gameTable("player_inventory").select("*").eq("agent_key", agentKey).order("item_name"),
    () => localStore.getInventory(agentKey),
  );
}

export async function addInventoryItem(opts: {
  agentKey: string;
  itemKey: string;
  itemName: string;
  emoji: string;
  category: "oggetto" | "materiale" | "ingrediente";
  quantity?: number;
  sellPrice?: number;
}): Promise<void> {
  const qty = opts.quantity ?? 1;
  try {
    const { data: existing } = await gameTable("player_inventory")
      .select("*")
      .eq("agent_key", opts.agentKey)
      .eq("item_key", opts.itemKey)
      .maybeSingle();

    if (existing) {
      await gameTable("player_inventory")
        .update({ quantity: existing.quantity + qty, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await gameTable("player_inventory").insert({
        agent_key: opts.agentKey,
        item_key: opts.itemKey,
        item_name: opts.itemName,
        emoji: opts.emoji,
        category: opts.category,
        quantity: qty,
        sell_price: opts.sellPrice ?? 20,
      });
    }
  } catch {
    const items = localStore.getInventory(opts.agentKey);
    const idx = items.findIndex((i) => i.item_key === opts.itemKey);
    if (idx >= 0) {
      items[idx] = { ...items[idx], quantity: items[idx].quantity + qty };
    } else {
      items.push({
        id: `local-${opts.itemKey}-${Date.now()}`,
        agent_key: opts.agentKey,
        item_key: opts.itemKey,
        item_name: opts.itemName,
        emoji: opts.emoji,
        category: opts.category,
        quantity: qty,
        sell_price: opts.sellPrice ?? 20,
      });
    }
    localStore.setInventory(opts.agentKey, items);
  }
}

export async function removeInventoryQuantity(
  agentKey: string,
  itemKey: string,
  quantity: number,
): Promise<boolean> {
  try {
    const { data: item } = await gameTable("player_inventory")
      .select("*")
      .eq("agent_key", agentKey)
      .eq("item_key", itemKey)
      .maybeSingle();
    if (!item || item.quantity < quantity) return false;
    const newQty = item.quantity - quantity;
    if (newQty <= 0) {
      await gameTable("player_inventory").delete().eq("id", item.id);
    } else {
      await gameTable("player_inventory").update({ quantity: newQty }).eq("id", item.id);
    }
    return true;
  } catch {
    const items = localStore.getInventory(agentKey);
    const idx = items.findIndex((i) => i.item_key === itemKey);
    if (idx < 0 || items[idx].quantity < quantity) return false;
    items[idx].quantity -= quantity;
    if (items[idx].quantity <= 0) items.splice(idx, 1);
    localStore.setInventory(agentKey, items);
    return true;
  }
}
