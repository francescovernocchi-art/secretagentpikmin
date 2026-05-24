import { useMemo } from "react";
import { generateTiles, TILE_PALETTE } from "@/lib/village/tileMap";
import { TILE, WORLD_W, WORLD_H } from "@/lib/village/mapProjection";
import type { BiomeKey } from "@/lib/village/biomes";

interface Props { seed: string; biome: BiomeKey; }

/** Terreno a tile cartoon: SVG con un <rect> per cella, leggero (~640 tile). */
export function TerrainLayer({ seed, biome }: Props) {
  const tiles = useMemo(() => generateTiles(seed, biome), [seed, biome]);
  return (
    <svg
      width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      className="absolute inset-0 select-none pointer-events-none"
      style={{ imageRendering: "pixelated" }}
      aria-hidden
    >
      {tiles.map((t, i) => {
        const p = TILE_PALETTE[t.kind];
        return (
          <rect
            key={i}
            x={t.col * TILE} y={t.row * TILE}
            width={TILE} height={TILE}
            fill={p.fill} stroke={p.stroke} strokeWidth={1}
            rx={6} ry={6}
          />
        );
      })}
    </svg>
  );
}
