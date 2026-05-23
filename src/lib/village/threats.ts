import { supabase } from "@/integrations/supabase/client";
import type { EnemyRow } from "@/lib/enemies";

const THREAT_RADIUS_M = 500; // raggio di rilevamento attorno al villaggio
const LAST_CHECK_KEY = "village.threat.lastCheck";
const COOLDOWN_MS = 60_000; // 1 minuto tra check automatici

export interface NearbyThreat {
  spawnId: string;
  enemy: EnemyRow;
  distance: number;
  lat: number;
  lng: number;
}

export interface VillageEvent {
  id: string;
  agent: string;
  kind: string;
  severity: string;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  resolved_at: string | null;
  created_at: string;
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function listOpenEvents(agent: string): Promise<VillageEvent[]> {
  const { data } = await supabase
    .from("village_events")
    .select("*")
    .eq("agent", agent)
    .is("resolved_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as VillageEvent[];
}

export async function listRecentEvents(agent: string, limit = 8): Promise<VillageEvent[]> {
  const { data } = await supabase
    .from("village_events")
    .select("*")
    .eq("agent", agent)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as VillageEvent[];
}

export async function resolveEvent(id: string) {
  await supabase.from("village_events").update({ resolved_at: new Date().toISOString() }).eq("id", id);
}

/** Scansiona nemici vicini e crea/risolve eventi minaccia. */
export async function scanThreats(params: {
  agent: string;
  baseLat: number | null;
  baseLng: number | null;
  totalDefense: number;
  force?: boolean;
}): Promise<{ created: number; auto: number; threats: NearbyThreat[] }> {
  if (params.baseLat == null || params.baseLng == null) {
    return { created: 0, auto: 0, threats: [] };
  }

  // Cooldown lato client
  if (!params.force && typeof window !== "undefined") {
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0);
    if (Date.now() - last < COOLDOWN_MS) {
      return { created: 0, auto: 0, threats: [] };
    }
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  }

  const { data: spawns } = await supabase
    .from("map_enemy_spawns")
    .select("id, enemy_id, lat, lng, active")
    .eq("active", true);

  if (!spawns || spawns.length === 0) return { created: 0, auto: 0, threats: [] };

  const enemyIds = Array.from(new Set(spawns.map((s) => s.enemy_id)));
  const { data: enemies } = await supabase
    .from("enemies")
    .select("*")
    .in("id", enemyIds);
  const enemyMap = new Map<string, EnemyRow>((enemies ?? []).map((e: any) => [e.id, e as EnemyRow]));

  const base = { lat: params.baseLat, lng: params.baseLng };
  const threats: NearbyThreat[] = [];
  for (const s of spawns) {
    const enemy = enemyMap.get(s.enemy_id);
    if (!enemy) continue;
    const distance = haversine(base, { lat: s.lat, lng: s.lng });
    if (distance <= THREAT_RADIUS_M) {
      threats.push({ spawnId: s.id, enemy, distance, lat: s.lat, lng: s.lng });
    }
  }

  if (threats.length === 0) return { created: 0, auto: 0, threats: [] };

  // Eventi già aperti per questi spawn → niente duplicati
  const { data: openEvents } = await supabase
    .from("village_events")
    .select("payload")
    .eq("agent", params.agent)
    .eq("kind", "threat")
    .is("resolved_at", null);
  const openSpawnIds = new Set(
    (openEvents ?? []).map((e: any) => e.payload?.spawn_id).filter(Boolean),
  );

  let created = 0;
  let auto = 0;
  for (const t of threats) {
    if (openSpawnIds.has(t.spawnId)) continue;
    const dangerScore = t.enemy.danger_level * 20;
    const autoDefend = params.totalDefense >= dangerScore;

    // Auto-difesa: muri/torri abbattono la minaccia, niente notifica panic
    const severity = t.enemy.danger_level >= 4 ? "critical" : t.enemy.danger_level >= 2 ? "high" : "normal";

    await supabase.from("village_events").insert({
      agent: params.agent,
      kind: autoDefend ? "threat_repelled" : "threat",
      severity: autoDefend ? "normal" : severity,
      title: autoDefend
        ? `Minaccia respinta: ${t.enemy.name}`
        : `Minaccia in avvicinamento: ${t.enemy.name}`,
      description: autoDefend
        ? `Le tue difese hanno neutralizzato ${t.enemy.name} a ${Math.round(t.distance)}m dal villaggio.`
        : `${t.enemy.name} (lv ${t.enemy.danger_level}) è entrato nel perimetro. Difesa insufficiente: rinforza muri e torri!`,
      payload: {
        spawn_id: t.spawnId,
        enemy_id: t.enemy.id,
        enemy_name: t.enemy.name,
        distance_m: Math.round(t.distance),
        danger_score: dangerScore,
        defense: params.totalDefense,
        lat: t.lat,
        lng: t.lng,
      },
      resolved_at: autoDefend ? new Date().toISOString() : null,
    });

    if (autoDefend) {
      auto++;
      // Disattiva lo spawn — i Pikmin l'hanno respinto
      await supabase
        .from("map_enemy_spawns")
        .update({ active: false, defeated_at: new Date().toISOString(), defeated_by: params.agent })
        .eq("id", t.spawnId);
    } else {
      created++;
      // Notifica all'agente
      await supabase.from("mission_notifications").insert({
        agent: params.agent,
        kind: "village_threat",
        payload: {
          enemy: t.enemy.name,
          distance: Math.round(t.distance),
          danger: t.enemy.danger_level,
        },
      });
    }
  }

  return { created, auto, threats };
}
