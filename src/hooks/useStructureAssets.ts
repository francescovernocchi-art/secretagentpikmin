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
}

/** Carica gli asset strutture per un bioma specifico (o tutti). */
export function useStructureAssets(biomeKey?: string) {
  const [assets, setAssets] = useState<StructureAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("village_structure_assets").select("*").order("building_type").order("level");
    if (biomeKey) q = q.eq("biome_key", biomeKey);
    const { data, error } = await q;
    if (!error) setAssets((data ?? []) as StructureAsset[]);
    setLoading(false);
  }, [biomeKey]);

  useEffect(() => { reload(); }, [reload]);

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

  return { assets, loading, reload, pick };
}
