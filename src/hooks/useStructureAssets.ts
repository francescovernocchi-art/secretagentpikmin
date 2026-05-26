import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StructureAsset {
  id: string;
  building_type: string;
  biome_key: string;
  level: number;
  variant: string;
  asset_url: string;
  shadow_url: string | null;
  glow_url: string | null;
  slot_fit_scale: number;
  anchor_x: number;
  anchor_y: number;
  offset_x: number;
  offset_y: number;
  idle_anim: string;
}

export interface StructureAssetUpsert {
  building_type: string;
  biome_key: string;
  level: number;
  variant?: string;
  asset_url: string;
  shadow_url?: string | null;
  glow_url?: string | null;
  slot_fit_scale?: number;
  anchor_x?: number;
  anchor_y?: number;
  offset_x?: number;
  offset_y?: number;
  idle_anim?: string;
}

/** Carica gli asset strutture per un bioma specifico (o tutti). */
export function useStructureAssets(biomeKey?: string) {
  const [assets, setAssets] = useState<StructureAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("village_structure_assets")
      .select("*")
      .order("building_type")
      .order("level");
    if (biomeKey) q = q.eq("biome_key", biomeKey);
    const { data, error } = await q;
    if (!error) setAssets((data ?? []) as unknown as StructureAsset[]);
    setLoading(false);
  }, [biomeKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Restituisce l'asset migliore per (type, level), con fallback al livello inferiore. */
  const pick = useCallback(
    (buildingType: string, level: number, variant = "default"): StructureAsset | null => {
      const candidates = assets.filter(
        (a) => a.building_type === buildingType && a.biome_key === biomeKey,
      );
      if (candidates.length === 0) return null;
      const exact = candidates.find((a) => a.level === level && a.variant === variant);
      if (exact) return exact;
      const sameLevel = candidates.find((a) => a.level === level);
      if (sameLevel) return sameLevel;
      const lower = candidates.filter((a) => a.level <= level).sort((a, b) => b.level - a.level)[0];
      return lower ?? candidates[0];
    },
    [assets, biomeKey],
  );

  /** Upsert per (building_type, biome_key, level, variant). */
  const upsertAsset = useCallback(async (input: StructureAssetUpsert) => {
    const payload = {
      building_type: input.building_type,
      biome_key: input.biome_key,
      level: input.level,
      variant: input.variant ?? "default",
      asset_url: input.asset_url,
      shadow_url: input.shadow_url ?? null,
      glow_url: input.glow_url ?? null,
      slot_fit_scale: input.slot_fit_scale ?? 0.9,
      anchor_x: input.anchor_x ?? 0.5,
      anchor_y: input.anchor_y ?? 1.0,
      offset_x: input.offset_x ?? 0,
      offset_y: input.offset_y ?? 0,
      idle_anim: input.idle_anim ?? "none",
    };
    const { data, error } = await supabase
      .from("village_structure_assets")
      .upsert(payload, { onConflict: "building_type,biome_key,level,variant" })
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as StructureAsset;
  }, []);

  const deleteAsset = useCallback(async (id: string) => {
    const { error } = await supabase.from("village_structure_assets").delete().eq("id", id);
    if (error) throw error;
  }, []);

  return { assets, loading, reload, pick, upsertAsset, deleteAsset };
}
