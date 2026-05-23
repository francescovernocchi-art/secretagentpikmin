import { supabase } from "@/integrations/supabase/client";

const LAST_KEY = "village.night.lastCheck";
const COOLDOWN_MS = 5 * 60_000;

export interface NightEvent {
  kind: "luna_piena" | "passaggio_lucciole" | "incubo" | "stella_cadente" | "raid_notturno";
  title: string;
  description: string;
  severity: "normal" | "high" | "critical";
  reward?: { coins?: number };
}

const POOL: NightEvent[] = [
  {
    kind: "passaggio_lucciole",
    title: "Passaggio delle lucciole",
    description: "Uno sciame di lucciole illumina il villaggio: i Pikmin raccolgono polvere luminosa.",
    severity: "normal",
    reward: { coins: 15 },
  },
  {
    kind: "luna_piena",
    title: "Luna piena",
    description: "La luna piena galvanizza i tuoi Pikmin: difesa raddoppiata fino all'alba.",
    severity: "normal",
  },
  {
    kind: "stella_cadente",
    title: "Stella cadente",
    description: "Una scia stellare cade vicino al perimetro. Hai ricevuto 30 monete della fortuna.",
    severity: "normal",
    reward: { coins: 30 },
  },
  {
    kind: "incubo",
    title: "Incubo nel bosco",
    description: "Ombre inquietanti si muovono ai bordi. I Pikmin di guardia sono allerta.",
    severity: "high",
  },
  {
    kind: "raid_notturno",
    title: "Raid notturno",
    description: "Predatori notturni si avvicinano! Difesa sotto pressione: rinforza muri e torri.",
    severity: "critical",
  },
];

export async function maybeTriggerNightEvent(params: {
  agent: string;
  isNight: boolean;
  totalDefense: number;
}): Promise<NightEvent | null> {
  if (!params.isNight) return null;
  if (typeof window !== "undefined") {
    const last = Number(localStorage.getItem(LAST_KEY) ?? 0);
    if (Date.now() - last < COOLDOWN_MS) return null;
    localStorage.setItem(LAST_KEY, String(Date.now()));
  }

  // 35% chance per check
  if (Math.random() > 0.35) return null;

  // Weight events: high difesa → eventi positivi più probabili
  const safe = params.totalDefense >= 30;
  const candidates = safe ? POOL.filter((e) => e.severity !== "critical") : POOL;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];

  await supabase.from("village_events").insert({
    agent: params.agent,
    kind: pick.kind,
    severity: pick.severity,
    title: pick.title,
    description: pick.description,
    payload: { reward: pick.reward ?? {}, night: true },
    resolved_at: pick.reward ? new Date().toISOString() : null,
  });

  // Reward via coin transaction (best-effort)
  if (pick.reward?.coins) {
    try {
      const { data: cur } = await supabase
        .from("agent_coins")
        .select("coins")
        .eq("agent", params.agent)
        .maybeSingle();
      const next = (cur?.coins ?? 0) + pick.reward.coins;
      if (cur) {
        await supabase.from("agent_coins").update({ coins: next, updated_at: new Date().toISOString() }).eq("agent", params.agent);
      } else {
        await supabase.from("agent_coins").insert({ agent: params.agent, coins: pick.reward.coins });
      }
      await supabase.from("coin_transactions").insert({
        agent: params.agent,
        amount: pick.reward.coins,
        reason: `Notte: ${pick.title}`,
      });
    } catch {
      // ignore
    }
  }

  if (pick.severity === "critical") {
    await supabase.from("mission_notifications").insert({
      agent: params.agent,
      kind: "village_night",
      payload: { title: pick.title },
    });
  }

  return pick;
}
