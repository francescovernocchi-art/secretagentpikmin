import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PIKMIN_LABEL, type PikminType } from "@/data/pikminSprites";

const KEYS: PikminType[] = ["red", "blue", "yellow", "purple", "white"];

export interface PikminSprites {
  idle: string | null;
  walk: string | null;
  sleep: string | null;
  attack: string | null;
}

export interface PikminLabel {
  name: string;
  image_url: string | null;
  icon_url: string | null;
  sprites: PikminSprites;
}

const EMPTY_SPRITES: PikminSprites = { idle: null, walk: null, sleep: null, attack: null };

export function usePikminLabels() {
  const [labels, setLabels] = useState<Record<PikminType, PikminLabel>>(() =>
    Object.fromEntries(
      KEYS.map((k) => [k, { name: PIKMIN_LABEL[k], image_url: null, icon_url: null, sprites: EMPTY_SPRITES }]),
    ) as Record<PikminType, PikminLabel>,
  );

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("pikmin_species")
      .select("key, name, image_url, icon_url, sprite_idle_url, sprite_walk_url, sprite_sleep_url, sprite_attack_url")
      .in("key", KEYS);
    if (!data) return;
    setLabels((prev) => {
      const next = { ...prev };
      for (const row of data as any[]) {
        const k = row.key as PikminType;
        if (!KEYS.includes(k)) continue;
        next[k] = {
          name: row.name ?? PIKMIN_LABEL[k],
          image_url: row.image_url ?? null,
          icon_url: row.icon_url ?? null,
          sprites: {
            idle: row.sprite_idle_url ?? null,
            walk: row.sprite_walk_url ?? null,
            sleep: row.sprite_sleep_url ?? null,
            attack: row.sprite_attack_url ?? null,
          },
        };
      }
      return next;
    });
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { labels, refresh };
}
