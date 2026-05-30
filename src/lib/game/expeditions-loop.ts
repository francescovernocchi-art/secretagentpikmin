import { BIOMES } from "@/data/secretPikminWorld";
import { gameTable, isSupabaseConfigured } from "@/lib/game/db";
import { addInventoryItem } from "@/lib/game/inventory";
import { localStore } from "@/lib/game/local-store";
import { recordMonsterEncounter } from "@/lib/game/bestiary";
import { addXpToPikminIds, XP_AMOUNTS } from "@/lib/game/pikmin-xp";
import { collectSpaceshipPart } from "@/lib/game/spaceship";
import { addPlanetResources } from "@/lib/game/planet";
import { pushGameNotification } from "@/lib/game/notifications";
import type { DbPikminUnit } from "@/types/phase2-db";
import type { ExpeditionObjectiveKey, Phase3Expedition } from "@/types/phase3-db";
import { EXPEDITION_OBJECTIVES } from "@/types/phase3-db";
import type { BiomeKey, PikminSpecializationKey } from "@/types/secretPikmin";

function riskMultiplier(risk: Phase3Expedition["risk"]): number {
  if (risk === "alto") return 1.4;
  if (risk === "medio") return 1.0;
  return 0.7;
}

function computeSuccessChance(
  objective: ExpeditionObjectiveKey,
  pikminIds: string[],
  risk: Phase3Expedition["risk"],
): number {
  const units = localStore.getPikminUnits().filter((u) => pikminIds.includes(u.id));
  const obj = EXPEDITION_OBJECTIVES.find((o) => o.key === objective)!;
  let chance = 0.55;
  for (const u of units) {
    chance += u.level * 0.015;
    if (u.specialization_key && obj.specBonus.includes(u.specialization_key as PikminSpecializationKey)) {
      chance += 0.08;
    }
  }
  chance -= riskMultiplier(risk) * 0.12;
  return Math.min(0.92, Math.max(0.25, chance));
}

export function estimateExpeditionReward(
  biome: BiomeKey,
  objective: ExpeditionObjectiveKey,
  pikminCount: number,
  duration: number,
  risk: Phase3Expedition["risk"],
) {
  const base = EXPEDITION_OBJECTIVES.find((o) => o.key === objective)?.xpPerPikmin ?? 25;
  const mult = riskMultiplier(risk) * (duration / 30);
  return {
    xp: Math.round(base * pikminCount * mult),
    coins: Math.round(20 * pikminCount * mult),
    items: Math.max(1, Math.floor(pikminCount * mult)),
  };
}

export async function startPhase3Expedition(opts: {
  agentKey: string;
  biome: BiomeKey;
  objective: ExpeditionObjectiveKey;
  pikminIds: string[];
  durationMinutes: number;
  risk: Phase3Expedition["risk"];
}): Promise<Phase3Expedition> {
  const objDef = EXPEDITION_OBJECTIVES.find((o) => o.key === opts.objective)!;
  const biomeDef = BIOMES.find((b) => b.key === opts.biome);
  const duration = opts.durationMinutes || objDef.baseDuration;
  const success_chance = computeSuccessChance(opts.objective, opts.pikminIds, opts.risk);
  const now = new Date();
  const end = new Date(now.getTime() + duration * 60000);

  const exp: Phase3Expedition = {
    id: crypto.randomUUID(),
    agent_key: opts.agentKey,
    biome: opts.biome,
    objective: opts.objective,
    title: `${objDef.label} · ${biomeDef?.label ?? opts.biome}`,
    pikmin_ids: opts.pikminIds,
    duration_minutes: duration,
    risk: opts.risk,
    success_chance,
    status: "active",
    started_at: now.toISOString(),
    end_at: end.toISOString(),
    rewards: estimateExpeditionReward(opts.biome, opts.objective, opts.pikminIds.length, duration, opts.risk),
  };

  const units = localStore.getPikminUnits();
  localStore.setPikminUnits(
    units.map((u) =>
      opts.pikminIds.includes(u.id) ? { ...u, status: "in_spedizione" } : u,
    ),
  );

  try {
    if (isSupabaseConfigured()) {
      await gameTable("expeditions").insert({
        id: exp.id,
        title: exp.title,
        biome: exp.biome,
        status: "active",
        duration_minutes: duration,
        started_at: exp.started_at,
        end_at: exp.end_at,
        created_by: opts.agentKey,
        template_key: `phase3_${opts.objective}`,
        success_chance,
        meta: { phase3: true, objective: opts.objective, pikmin_ids: opts.pikminIds, risk: opts.risk },
      });
      for (const pid of opts.pikminIds) {
        await gameTable("pikmin_expedition_units").insert({
          expedition_id: exp.id,
          pikmin_unit_id: pid,
          owner_agent: opts.agentKey,
        });
        await gameTable("pikmin_units").update({ status: "in_spedizione" }).eq("id", pid);
      }
    }
  } catch {}

  localStore.addPhase3Expedition(exp);
  return exp;
}

export async function completeDueExpeditions(agentKey?: string): Promise<Phase3Expedition[]> {
  const all = localStore.getPhase3Expeditions();
  const now = Date.now();
  const due = all.filter(
    (e) => e.status === "active" && new Date(e.end_at).getTime() <= now && (!agentKey || e.agent_key === agentKey),
  );
  const completed: Phase3Expedition[] = [];
  for (const exp of due) {
    const result = await resolvePhase3Expedition(exp.id);
    if (result) completed.push(result);
  }
  return completed;
}

export async function resolvePhase3Expedition(expId: string): Promise<Phase3Expedition | null> {
  const all = localStore.getPhase3Expeditions();
  const idx = all.findIndex((e) => e.id === expId);
  if (idx < 0) return null;
  const exp = all[idx];
  if (exp.status !== "active") return exp;

  const roll = Math.random();
  const success = roll < exp.success_chance;
  exp.status = success ? "completed" : "failed";
  const biome = BIOMES.find((b) => b.key === exp.biome)!;
  const effects: string[] = [];

  if (success) {
    const xpBase = EXPEDITION_OBJECTIVES.find((o) => o.key === exp.objective)?.xpPerPikmin ?? 30;
    const xpEach = Math.round(xpBase * riskMultiplier(exp.risk));
    await addXpToPikminIds(exp.pikmin_ids, xpEach, "spedizione");

    switch (exp.objective) {
      case "raccolta":
      case "ingredienti": {
        const ing = biome.ingredients[Math.floor(Math.random() * biome.ingredients.length)] ?? "miele";
        await addInventoryItem({
          agentKey: exp.agent_key,
          itemKey: ing.replace(/\s+/g, "_").toLowerCase(),
          itemName: ing,
          emoji: "🍯",
          category: "ingrediente",
          sellPrice: 25,
        });
        effects.push(`Raccolto: ${ing}`);
        break;
      }
      case "ricerca_navicella": {
        const missing = localStore.getShipParts().filter((p) => !p.collected);
        if (missing.length) {
          const part = missing[Math.floor(Math.random() * missing.length)];
          await collectSpaceshipPart(part.key, exp.agent_key);
          await addXpToPikminIds(exp.pikmin_ids, XP_AMOUNTS.pezzo_navicella, "pezzo_navicella");
          effects.push(`Pezzo trovato: ${part.name}`);
        }
        break;
      }
      case "studio_mostri": {
        const mon = biome.frequentMonsters[Math.floor(Math.random() * biome.frequentMonsters.length)] ?? "Creatura";
        const key = mon.toLowerCase().replace(/\s+/g, "_");
        const { statusLabel } = await recordMonsterEncounter({
          creatureKey: key,
          name: mon,
          emoji: "👾",
          biomeKey: exp.biome,
          discoveredBy: exp.agent_key,
          source: "spedizione",
        });
        effects.push(`Mostro ${statusLabel}: ${mon}`);
        break;
      }
      case "scouting":
        localStore.setBiome(exp.agent_key, exp.biome);
        effects.push(`Bioma ${biome.label} mappato`);
        break;
      case "difesa":
        await addPlanetResources({ morale: 5 });
        effects.push("Villaggio difeso — morale +5%");
        break;
    }
  }

  exp.summary = success ? `Successo! ${effects.join(" · ")}` : "Spedizione fallita — squadra rientrata stanca";
  exp.rewards = { ...exp.rewards, effects, success };

  const units = localStore.getPikminUnits();
  localStore.setPikminUnits(
    units.map((u) => (exp.pikmin_ids.includes(u.id) ? { ...u, status: "disponibile" } : u)),
  );

  try {
    if (isSupabaseConfigured()) {
      await gameTable("expeditions").update({
        status: exp.status,
        resolved_at: new Date().toISOString(),
        result: success ? "successo" : "fallito",
      }).eq("id", exp.id);
      for (const pid of exp.pikmin_ids) {
        await gameTable("pikmin_units").update({ status: "disponibile" }).eq("id", pid);
      }
    }
  } catch {}

  all[idx] = exp;
  localStore.setPhase3Expeditions(all);

  if (success) {
    await pushGameNotification({
      agentKey: exp.agent_key,
      kind: "expedition_completed",
      title: "Spedizione completata",
      body: exp.summary ?? exp.title,
      payload: { expedition_id: expId },
    });
  }

  return exp;
}

export async function fetchPhase3Expeditions(agentKey?: string): Promise<Phase3Expedition[]> {
  await completeDueExpeditions(agentKey);
  const all = localStore.getPhase3Expeditions();
  return agentKey ? all.filter((e) => e.agent_key === agentKey) : all;
}

export function availablePikminForExpedition(agentKey: string): DbPikminUnit[] {
  return localStore.getPikminUnits(agentKey).filter((u) => u.status === "disponibile");
}
