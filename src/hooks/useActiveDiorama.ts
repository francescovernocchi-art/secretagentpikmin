import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DioramaRow {
  id: string;
  owner_id: string | null;
  biome: string;
  name: string;
  image_url: string;
  width: number;
  height: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
}

export interface DioramaSlot {
  id: string;
  diorama_id: string;
  biome_key: string | null;
  slot_key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  size?: "small" | "medium" | "large";
  allowed_categories: string[];
}

/** Sceglie il diorama attivo per il bioma: prima quello dell'utente, poi quello di sistema. */
export function useActiveDiorama(biome: string | null | undefined) {
  const [diorama, setDiorama] = useState<DioramaRow | null>(null);
  const [slots, setSlots] = useState<DioramaSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!biome) return;
    setLoading(true);
    const { data: userDio } = await supabase
      .from("village_dioramas")
      .select("*")
      .eq("biome", biome)
      .eq("is_active", true)
      .eq("is_system", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let active: DioramaRow | null = userDio as any;
    if (!active) {
      const { data: sysDio } = await supabase
        .from("village_dioramas")
        .select("*")
        .eq("biome", biome)
        .eq("is_system", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      active = sysDio as any;
    }
    setDiorama(active);

    if (active) {
      const { data: s } = await supabase
        .from("village_diorama_slots")
        .select("*")
        .eq("diorama_id", active.id)
        .order("slot_key");
      setSlots((s ?? []) as any);
    } else {
      setSlots([]);
    }
    setLoading(false);
  }, [biome]);

  useEffect(() => {
    load();
  }, [load]);

  return { diorama, slots, loading, reload: load };
}

/** Lista tutti i diorami che l'utente può vedere/scegliere per un bioma (suoi + sistema). */
export function useDioramaLibrary(biome: string | null | undefined) {
  const [items, setItems] = useState<DioramaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!biome) return;
    setLoading(true);
    const { data } = await supabase
      .from("village_dioramas")
      .select("*")
      .eq("biome", biome)
      .order("is_system", { ascending: true })
      .order("updated_at", { ascending: false });
    setItems((data ?? []) as any);
    setLoading(false);
  }, [biome]);

  useEffect(() => {
    load();
  }, [load]);
  return { items, loading, reload: load };
}
