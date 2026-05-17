import { supabase } from "@/integrations/supabase/client";

export type EnemyRow = {
  id: string;
  key: string;
  name: string;
  emoji: string;
  image_url: string | null;
  description: string | null;
  danger_level: number;
  habitat: string | null;
  behavior: string | null;
  speed: string | null;
  damage: number;
  hp: number;
  spawn_probability: number;
  pikmin_eat_min: number;
  pikmin_eat_max: number;
  recommended_pikmin: string[];
  source_url: string | null;
};

export type PikminType = "red" | "yellow" | "blue" | "purple" | "white" | "rock" | "wing" | "ice" | "glow";

export const PIKMIN_TYPES: PikminType[] = ["red", "yellow", "blue", "purple", "white", "rock", "wing", "ice", "glow"];

export const PIKMIN_TYPE_LABEL: Record<PikminType, string> = {
  red: "Rosso",
  yellow: "Giallo",
  blue: "Blu",
  purple: "Viola",
  white: "Bianco",
  rock: "Roccioso",
  wing: "Alato",
  ice: "Gelato",
  glow: "Iridescente",
};

export const PIKMIN_TYPE_EMOJI: Record<PikminType, string> = {
  red: "🔴",
  yellow: "🟡",
  blue: "🔵",
  purple: "🟣",
  white: "⚪",
  rock: "🪨",
  wing: "🦋",
  ice: "❄️",
  glow: "✨",
};

/** Base attack power per pikmin type (vs generic enemy). */
const BASE_ATTACK: Record<PikminType, number> = {
  red: 2, yellow: 1.4, blue: 1.4, purple: 3, white: 1.2, rock: 2.5, wing: 1.2, ice: 1.6, glow: 1.8,
};

/** Pondera la probabilità di spawn: più forte = più raro (già nella prob). Restituisce un nemico pesato o null. */
export function rollEnemy(enemies: EnemyRow[]): EnemyRow | null {
  if (enemies.length === 0) return null;
  const total = enemies.reduce((s, e) => s + Math.max(0, e.spawn_probability), 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const e of enemies) {
    r -= Math.max(0, e.spawn_probability);
    if (r <= 0) return e;
  }
  return enemies[enemies.length - 1];
}

export type BattleSquad = Partial<Record<PikminType, number>>;

export type BattleResult = {
  outcome: "vittoria" | "sconfitta";
  damageDealt: number;
  pikminLost: BattleSquad;
  totalLost: number;
  rewards: { xp: number; coins: number };
  summary: string;
};

/** Calcola l'esito della battaglia. */
export function simulateBattle(enemy: EnemyRow, squad: BattleSquad): BattleResult {
  const recommended = new Set(enemy.recommended_pikmin);
  let dmg = 0;
  for (const t of PIKMIN_TYPES) {
    const n = squad[t] ?? 0;
    if (n <= 0) continue;
    const bonus = recommended.has(t) ? 2 : 1;
    dmg += n * BASE_ATTACK[t] * bonus;
  }
  // randomness ±15%
  dmg = Math.round(dmg * (0.85 + Math.random() * 0.3));

  const win = dmg >= enemy.hp;
  const pikminLost: BattleSquad = {};
  let totalLost = 0;

  if (win) {
    // perdite leggere: nemico ne mangia ~min, distribuite sui tipi non raccomandati prima
    const losses = Math.max(0, enemy.pikmin_eat_min - Math.floor(dmg / Math.max(1, enemy.hp)));
    totalLost = distributeLosses(losses, squad, enemy.recommended_pikmin, pikminLost);
  } else {
    // sconfitta: il nemico mangia tra eat_min e eat_max
    const losses = enemy.pikmin_eat_min + Math.floor(Math.random() * (enemy.pikmin_eat_max - enemy.pikmin_eat_min + 1));
    totalLost = distributeLosses(losses, squad, enemy.recommended_pikmin, pikminLost);
  }

  const rewards = win
    ? { xp: 15 + enemy.danger_level * 10, coins: 5 + enemy.danger_level * 5 }
    : { xp: 0, coins: 0 };

  const lostParts = Object.entries(pikminLost)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([t, n]) => `${n} ${PIKMIN_TYPE_LABEL[t as PikminType]}`)
    .join(", ");
  const summary = win
    ? `Vittoria! ${enemy.name} sconfitto.${lostParts ? ` Perdite: ${lostParts}.` : " Nessuna perdita."} +${rewards.xp} XP, +${rewards.coins} 🪙.`
    : `Sconfitta. ${enemy.name} ha mangiato ${lostParts || `${totalLost} Pikmin`}.`;

  return { outcome: win ? "vittoria" : "sconfitta", damageDealt: dmg, pikminLost, totalLost, rewards, summary };
}

function distributeLosses(
  losses: number,
  squad: BattleSquad,
  recommended: string[],
  out: BattleSquad,
): number {
  if (losses <= 0) return 0;
  // ordina i tipi: i NON raccomandati muoiono prima
  const sent = PIKMIN_TYPES.filter((t) => (squad[t] ?? 0) > 0).sort((a, b) => {
    const ra = recommended.includes(a) ? 1 : 0;
    const rb = recommended.includes(b) ? 1 : 0;
    return ra - rb;
  });
  let remaining = losses;
  let total = 0;
  for (const t of sent) {
    if (remaining <= 0) break;
    const avail = squad[t] ?? 0;
    const take = Math.min(avail, remaining);
    out[t] = (out[t] ?? 0) + take;
    remaining -= take;
    total += take;
  }
  return total;
}

/** Tenta di applicare le perdite di Pikmin alla squadra (RPC adjust_pikmin con tipo). */
export async function applyPikminLosses(losses: BattleSquad, agent: string) {
  for (const [type, qty] of Object.entries(losses)) {
    if (!qty || qty <= 0) continue;
    try {
      await supabase.rpc("adjust_pikmin", {
        p_delta: -qty,
        p_reason: "battle_loss",
        p_agent: agent,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        p_meta: { type } as any,
      });
    } catch {
      // non bloccare se il count è già a zero
    }
  }
}

export async function getPikminBreakdown(): Promise<BattleSquad> {
  const { data } = await supabase
    .from("pikmin_squad")
    .select("count, breakdown")
    .eq("id", "team")
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bk = ((data as any)?.breakdown ?? {}) as BattleSquad;
  const total = (data?.count as number) ?? 0;
  const sum = Object.values(bk).reduce((s, n) => s + (n ?? 0), 0);
  // Fallback retrocompatibile: se non c'è breakdown ma esistono pikmin, distribuiscili sui tipi base
  if (sum === 0 && total > 0) {
    const base: BattleSquad = {};
    const types: PikminType[] = ["red", "yellow", "blue"];
    let left = total;
    for (let i = 0; i < types.length; i++) {
      const share = i === types.length - 1 ? left : Math.floor(total / types.length);
      base[types[i]] = share;
      left -= share;
    }
    return base;
  }
  return bk;
}
