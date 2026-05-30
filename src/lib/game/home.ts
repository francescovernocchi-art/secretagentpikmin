import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured, safeGameQuery } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import { fetchPlanetStatus } from "@/lib/game/planet";
import { fetchSpaceshipParts, shipProgressPercent } from "@/lib/game/spaceship";
import { fetchRecentScans } from "@/lib/game/scanner";
import type { DbExpeditionRow, DbFamilyMember, DbScanResult } from "@/types/phase2-db";

export interface HomeDashboardData {
  planet: Awaited<ReturnType<typeof fetchPlanetStatus>>["data"];
  shipParts: Awaited<ReturnType<typeof fetchSpaceshipParts>>["data"];
  shipPercent: number;
  expeditions: DbExpeditionRow[];
  family: DbFamilyMember[];
  discoveries: DbScanResult[];
  activeMissionCount: number;
  source: "supabase" | "local" | "mixed";
}

export async function fetchHomeDashboard(): Promise<HomeDashboardData> {
  const [planetRes, shipRes, scansRes, familyRes, expeditionsRes, missionsRes] = await Promise.all([
    fetchPlanetStatus(),
    fetchSpaceshipParts(),
    fetchRecentScans(5),
    safeGameQuery(
      () => import("@/lib/game/db").then(({ gameTable }) => gameTable("family_members").select("*").order("display_name")),
      () => localStore.getFamily(),
    ),
    fetchActiveExpeditions(),
    fetchActiveMissionCount(),
  ]);

  const sources = new Set([planetRes.source, shipRes.source, scansRes.source, familyRes.source]);
  const source = sources.size === 1 ? ([...sources][0] as "supabase" | "local") : "mixed";

  return {
    planet: planetRes.data,
    shipParts: shipRes.data,
    shipPercent: shipProgressPercent(shipRes.data),
    expeditions: expeditionsRes,
    family: familyRes.data as DbFamilyMember[],
    discoveries: scansRes.data,
    activeMissionCount: missionsRes,
    source,
  };
}

async function fetchActiveExpeditions(): Promise<DbExpeditionRow[]> {
  try {
    if (!isSupabaseConfigured()) return localStore.getExpeditions();
    const { data, error } = await supabase
      .from("expeditions")
      .select("id, title, biome, status, duration_minutes, end_at, created_by")
      .in("status", ["running", "pending", "returning"])
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    if ((data ?? []).length > 0) return data as DbExpeditionRow[];
  } catch {}
  return localStore.getExpeditions();
}

async function fetchActiveMissionCount(): Promise<number> {
  try {
    if (!isSupabaseConfigured()) return 0;
    const { data } = await supabase.from("missions").select("status");
    return (data ?? []).filter((m) => m.status !== "approvata").length;
  } catch {
    return 0;
  }
}

export function formatRelativeTime(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins} min fa`;
  if (mins < 1440) return `${Math.floor(mins / 60)} ore fa`;
  return "ieri";
}

export function expeditionEtaMinutes(exp: DbExpeditionRow): number {
  if (!exp.end_at) return exp.duration_minutes;
  return Math.max(0, Math.ceil((new Date(exp.end_at).getTime() - Date.now()) / 60000));
}
