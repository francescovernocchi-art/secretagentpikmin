import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PIKMIN_LABEL, type PikminType } from "@/data/pikminSprites";

const KEYS: PikminType[] = ["red", "blue", "yellow", "purple", "white"];

export interface PikminLabel {
  name: string;
  image_url: string | null;
}

export function usePikminLabels() {
  const [labels, setLabels] = useState<Record<PikminType, PikminLabel>>(() =>
    Object.fromEntries(
      KEYS.map((k) => [k, { name: PIKMIN_LABEL[k], image_url: null }]),
    ) as Record<PikminType, PikminLabel>,
  );

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("pikmin_species")
      .select("key, name, image_url")
      .in("key", KEYS);
    if (!data) return;
    setLabels((prev) => {
      const next = { ...prev };
      for (const row of data as any[]) {
        const k = row.key as PikminType;
        if (!KEYS.includes(k)) continue;
        next[k] = { name: row.name ?? PIKMIN_LABEL[k], image_url: row.image_url ?? null };
      }
      return next;
    });
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { labels, refresh };
}
