import { supabase } from "@/integrations/supabase/client";

export interface WallSegment {
  id: string;
  agent: string;
  from_x: number;
  from_y: number;
  to_x: number;
  to_y: number;
  level: number;
  material: string;
  created_at: string;
  updated_at: string;
}

export const WALL_MATERIALS: Record<string, { label: string; color: string; defense: number; cost: number }> = {
  wood:    { label: "Legno",    color: "#a0522d", defense: 2, cost: 10 },
  stone:   { label: "Pietra",   color: "#94a3b8", defense: 5, cost: 30 },
  crystal: { label: "Cristallo",color: "#c084fc", defense: 9, cost: 80 },
  alloy:   { label: "Lega tech",color: "#7dd3fc", defense: 12, cost: 150 },
};

export async function listWalls(agent: string): Promise<WallSegment[]> {
  const { data, error } = await supabase
    .from("village_walls")
    .select("*")
    .eq("agent", agent)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as WallSegment[];
}

export async function addWall(params: {
  agent: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  material: string;
}) {
  const { error } = await supabase.from("village_walls").insert({
    agent: params.agent,
    from_x: Math.round(params.from.x),
    from_y: Math.round(params.from.y),
    to_x: Math.round(params.to.x),
    to_y: Math.round(params.to.y),
    material: params.material,
    level: 1,
  });
  if (error) throw error;
}

export async function deleteWall(id: string) {
  await supabase.from("village_walls").delete().eq("id", id);
}

export async function upgradeWall(id: string, level: number) {
  await supabase.from("village_walls").update({ level, updated_at: new Date().toISOString() }).eq("id", id);
}

/** Bonus difensivo aggregato dei muri (sommato al defense_rating della base). */
export function wallDefenseBonus(walls: WallSegment[]): number {
  let total = 0;
  for (const w of walls) {
    const mat = WALL_MATERIALS[w.material] ?? WALL_MATERIALS.wood;
    total += mat.defense * w.level;
  }
  return total;
}
