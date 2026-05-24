import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PikminSpeciesRow {
  key: string;
  name: string;
  color: string | null;
  image_url: string | null;
  icon_url: string | null;
  sprite_idle_url: string | null;
  sprite_walk_url: string | null;
  sprite_sleep_url: string | null;
  sprite_attack_url: string | null;
}

/** Carica TUTTE le specie Pikmin definite dall'admin nel DB. */
export function usePikminSpecies() {
  const [species, setSpecies] = useState<PikminSpeciesRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pikmin_species")
      .select("key,name,color,image_url,icon_url,sprite_idle_url,sprite_walk_url,sprite_sleep_url,sprite_attack_url")
      .order("sort_order", { ascending: true });
    setSpecies((data as PikminSpeciesRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { species, loading, refresh };
}
