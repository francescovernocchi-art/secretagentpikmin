import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WORLD_W, WORLD_H } from "@/lib/village/mapProjection";
import type { BiomeKey } from "@/lib/village/biomes";

interface SpriteAsset { id: string; url: string; name: string; tags: string[]; }

interface Props { biome: BiomeKey; seed: string; }

/** Decorazioni giganti del bioma da sprite_assets (tag=biome o category=decorazione). */
export function ObjectsLayer({ biome, seed }: Props) {
  const [assets, setAssets] = useState<SpriteAsset[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sprite_assets")
        .select("id,url,name,tags")
        .eq("category", "decorazione")
        .contains("tags", [biome])
        .limit(20);
      if (!cancelled) setAssets((data as SpriteAsset[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [biome]);

  // Posizioni deterministiche
  const placed = useMemo(() => {
    if (!assets.length) return [];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 0xffffffff; };
    return assets.map((a) => ({
      ...a,
      x: 80 + rnd() * (WORLD_W - 160),
      y: 80 + rnd() * (WORLD_H - 160),
      size: 48 + Math.floor(rnd() * 40),
      flip: rnd() > 0.5,
    }));
  }, [assets, seed]);

  if (!placed.length) return null;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {placed.map((o) => (
        <img
          key={o.id} src={o.url} alt={o.name}
          className="absolute select-none"
          draggable={false}
          style={{
            left: o.x - o.size / 2,
            top: o.y - o.size,
            width: o.size, height: "auto",
            transform: o.flip ? "scaleX(-1)" : undefined,
            filter: "drop-shadow(0 4px 4px rgba(0,0,0,.35))",
            opacity: 0.92,
          }}
        />
      ))}
    </div>
  );
}
