import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VillageEventRow } from "@/lib/village/eventTypes";

function normalize(rows: any[]): VillageEventRow[] {
  const now = Date.now();
  return (rows ?? [])
    .map((r) => ({
      ...r,
      effects: (r.effects ?? {}) as VillageEventRow["effects"],
      bonuses: Array.isArray(r.bonuses) ? r.bonuses : [],
      maluses: Array.isArray(r.maluses) ? r.maluses : [],
    }))
    .filter((r) => r.is_active)
    .filter((r) => !r.ends_at || new Date(r.ends_at).getTime() > now)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/** Eventi attivi per il bioma corrente (NULL biome_key = applicabile a tutti). */
export function useActiveVillageEvents(biome: string | null | undefined) {
  const [events, setEvents] = useState<VillageEventRow[]>([]);

  const load = useCallback(async () => {
    if (!biome) { setEvents([]); return; }
    const { data } = await supabase
      .from("village_diorama_events")
      .select("*")
      .eq("is_active", true)
      .or(`biome_key.is.null,biome_key.eq.${biome}`);
    setEvents(normalize(data ?? []));
  }, [biome]);

  useEffect(() => {
    load();
    const ch = supabase.channel(`village_events:${biome ?? "all"}:${Math.random().toString(36).slice(2)}`);
    ch.on("postgres_changes" as any, { event: "*", schema: "public", table: "village_diorama_events" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [biome, load]);

  return { events, reload: load };
}

/** Tutti gli eventi (admin). */
export function useAllVillageEvents() {
  const [events, setEvents] = useState<VillageEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("village_diorama_events")
      .select("*")
      .order("priority", { ascending: false })
      .order("name");
    setEvents((data ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { events, loading, reload: load };
}
