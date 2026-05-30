import { gameTable, isSupabaseConfigured } from "@/lib/game/db";
import { fetchInventory, removeInventoryQuantity } from "@/lib/game/inventory";
import { localStore } from "@/lib/game/local-store";
import { addPlanetResources, payPlanetDebt } from "@/lib/game/planet";
import { addXpToAvailableSquad, addPikminXp, XP_AMOUNTS } from "@/lib/game/pikmin-xp";
import type { TransformResult, TransformTarget } from "@/types/phase3-db";

const FOOD_KEYS = /frutt|miele|seme|bacc|fungo|erba|carota|patat|insal|verdur|ingrediente|mela|pera|uva|noci/i;
const ENERGY_KEYS = /cristall|batter|energia|condens|plasma|carbur|nucleo|fulmine|elettr/i;
const MATERIAL_KEYS = /rottam|metall|ferro|rame|legno|pietra|mineral|vite|bullone|schegg|componente|materiale/i;
const RELIC_KEYS = /reliqu|artefatt|antich|tesoro|gemma|raro|oggetto_raro|reliquia/i;

function classifyItem(itemKey: string, category: string): TransformTarget | null {
  const k = itemKey.toLowerCase();
  if (category === "ingrediente" || FOOD_KEYS.test(k)) return "food";
  if (ENERGY_KEYS.test(k)) return "energy";
  if (category === "materiale" || MATERIAL_KEYS.test(k)) return "materials";
  if (category === "oggetto" || RELIC_KEYS.test(k)) return "credits";
  return null;
}

export function getTransformableCounts(items: Awaited<ReturnType<typeof fetchInventory>>["data"]) {
  const counts = { food: 0, energy: 0, materials: 0, credits: 0 };
  for (const item of items) {
    const kind = classifyItem(item.item_key, item.category);
    if (kind === "food") counts.food += item.quantity;
    else if (kind === "energy") counts.energy += item.quantity;
    else if (kind === "materials") counts.materials += item.quantity;
    else if (kind === "credits") counts.credits += item.quantity;
  }
  return counts;
}

export async function transformInventory(
  agentKey: string,
  target: TransformTarget,
): Promise<TransformResult> {
  const { data: items } = await fetchInventory(agentKey);
  const matching = items.filter((i) => {
    const kind = classifyItem(i.item_key, i.category);
    if (target === "food") return kind === "food";
    if (target === "energy") return kind === "energy";
    if (target === "materials") return kind === "materials";
    if (target === "credits") return kind === "credits";
    return false;
  });

  if (matching.length === 0) {
    return { success: false, message: "Nessun oggetto compatibile in inventario" };
  }

  let totalQty = 0;
  let credits = 0;
  for (const item of matching) {
    const ok = await removeInventoryQuantity(agentKey, item.item_key, item.quantity);
    if (ok) {
      totalQty += item.quantity;
      if (target === "credits") credits += item.sell_price * item.quantity;
    }
  }

  if (totalQty === 0) return { success: false, message: "Errore durante la trasformazione" };

  const xpUnit = localStore.getPikminUnits(agentKey).find((u) => u.status === "disponibile");
  if (xpUnit) await addPikminXp(xpUnit.id, XP_AMOUNTS.trasformazione, "trasformazione", { target });

  switch (target) {
    case "food": {
      const gain = Math.min(100, totalQty * 4);
      await addPlanetResources({ food: gain });
      return { success: true, message: `+${gain}% cibo planetario da ${totalQty} ingredienti`, planetDelta: { food: gain } };
    }
    case "energy": {
      const gain = Math.min(100, totalQty * 5);
      await addPlanetResources({ energy: gain });
      return { success: true, message: `+${gain}% energia da ${totalQty} componenti`, planetDelta: { energy: gain } };
    }
    case "materials": {
      await addInventoryItemInternal(agentKey, "materiali_raffinati", "Materiali raffinati", "🔩", "materiale", totalQty, 0);
      return { success: true, message: `${totalQty} lotti di materiali raffinati al magazzino` };
    }
    case "credits": {
      await payPlanetDebt(credits);
      await addXpToAvailableSquad(agentKey, XP_AMOUNTS.vendita, "vendita", 2);
      return { success: true, message: `${credits} cr versati al debito planetario`, credits };
    }
    default:
      return { success: false, message: "Target non valido" };
  }
}

async function addInventoryItemInternal(
  agentKey: string,
  itemKey: string,
  itemName: string,
  emoji: string,
  category: "materiale",
  quantity: number,
  sellPrice: number,
) {
  const { addInventoryItem } = await import("@/lib/game/inventory");
  await addInventoryItem({ agentKey, itemKey, itemName, emoji, category, sellPrice, quantity });
}

export const TRANSFORM_LABELS: Record<TransformTarget, { label: string; emoji: string; desc: string }> = {
  food: { label: "Trasforma in Cibo", emoji: "🍎", desc: "Frutta e ingredienti → rifornimenti pianeta" },
  energy: { label: "Trasforma in Energia", emoji: "⚡", desc: "Cristalli e batterie → energia" },
  materials: { label: "Trasforma in Materiali", emoji: "🔩", desc: "Rottami e metallo → materiali da costruzione" },
  credits: { label: "Vendi per Crediti", emoji: "💰", desc: "Reliquie e oggetti rari → crediti al debito" },
};
