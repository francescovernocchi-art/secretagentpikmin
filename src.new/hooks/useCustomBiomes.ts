import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerCustomBiomes, getAllBiomes, type BiomeConfig } from "@/lib/village/biomes";

export interface CustomBiomeRow {
  id: string;
  key: string;
  label: string;
  emoji: string;
  image_url: string | null;
  tagline: string | null;
  bonuses: string[];
  accent: string;
  sort_order: number;
  is_active: boolean;
}

function rowToConfig(r: CustomBiomeRow): BiomeConfig {
  return {
    key: r.key,
    label: r.label,
    emoji: r.emoji,
    image: r.image_url ?? "",
    tagline: r.tagline ?? "",
    bonuses: r.bonuses ?? [],
    accent: r.accent || "#7cd99a",
  };
}

/** Carica i biomi custom dal DB e li registra nel registry globale. */
export function useCustomBiomes() {
  const [rows, setRows] = useState<CustomBiomeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("village_biomes")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const list = (data ?? []) as CustomBiomeRow[];
    setRows(list);
    registerCustomBiomes(list.map(rowToConfig));
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { rows, loading, reload, allBiomes: getAllBiomes() };
}

/** Versione admin: carica tutti, anche disattivati. */
export function useAllCustomBiomes() {
  const [rows, setRows] = useState<CustomBiomeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("village_biomes")
      .select("*")
      .order("sort_order", { ascending: true });
    setRows((data ?? []) as CustomBiomeRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { rows, loading, reload };
}
