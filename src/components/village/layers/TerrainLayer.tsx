import { useMemo } from "react";
import { generateTiles, TILE_PALETTE } from "@/lib/village/tileMap";
import { TILE, WORLD_W, WORLD_H } from "@/lib/village/mapProjection";
import type { BiomeKey } from "@/lib/village/biomes";

interface Props { seed: string; biome: BiomeKey; }

function jitter(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), h | 1); h ^= h + Math.imul(h ^ (h >>> 7), h | 61); return ((h ^ (h >>> 14)) >>> 0) / 4294967296; };
}

/** Terreno organico edge-to-edge: nessun bordo visibile, decorazioni sparse. */
export function TerrainLayer({ seed, biome }: Props) {
  const tiles = useMemo(() => generateTiles(seed, biome), [seed, biome]);
  const rnd = useMemo(() => jitter(`${seed}|deco|${biome}`), [seed, biome]);

  const decor = useMemo(() => {
    const items: { x: number; y: number; kind: "grass" | "flower" | "pebble"; hue: string }[] = [];
    const COUNT = 380;
    const flowerHues = ["#ffd166", "#ef476f", "#f8edeb", "#c8b6ff", "#ffb4a2"];
    for (let i = 0; i < COUNT; i++) {
      const v = rnd();
      const kind: "grass" | "flower" | "pebble" = v < 0.6 ? "grass" : v < 0.85 ? "flower" : "pebble";
      items.push({
        x: rnd() * WORLD_W,
        y: rnd() * WORLD_H,
        kind,
        hue: flowerHues[Math.floor(rnd() * flowerHues.length)],
      });
    }
    return items;
  }, [rnd]);

  return (
    <svg
      width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      className="absolute inset-0 select-none pointer-events-none"
      aria-hidden
    >
      <rect x={0} y={0} width={WORLD_W} height={WORLD_H}
        fill={TILE_PALETTE[tiles[0]?.kind ?? "grass"].fill} />

      {tiles.map((t, i) => {
        const p = TILE_PALETTE[t.kind];
        if (i > 0 && t.kind === tiles[0].kind) return null;
        const ox = ((i * 17) % 9) - 4;
        const oy = ((i * 29) % 9) - 4;
        return (
          <ellipse
            key={i}
            cx={t.col * TILE + TILE / 2 + ox}
            cy={t.row * TILE + TILE / 2 + oy}
            rx={TILE * 0.78}
            ry={TILE * 0.62}
            fill={p.fill}
            opacity={0.85}
          />
        );
      })}

      {decor.map((d, i) => {
        if (d.kind === "grass") {
          return (
            <g key={i} opacity={0.7}>
              <path d={`M ${d.x} ${d.y} q -2 -6 -1 -10 M ${d.x + 2} ${d.y} q 2 -7 4 -11 M ${d.x - 2} ${d.y} q -2 -5 -4 -9`}
                stroke="#2f5a2a" strokeWidth={1.5} strokeLinecap="round" fill="none" />
            </g>
          );
        }
        if (d.kind === "flower") {
          return (
            <g key={i}>
              <circle cx={d.x} cy={d.y} r={2.6} fill={d.hue} />
              <circle cx={d.x} cy={d.y} r={1} fill="#fff7d6" />
            </g>
          );
        }
        return <circle key={i} cx={d.x} cy={d.y} r={2} fill="#6e6862" opacity={0.55} />;
      })}
    </svg>
  );
}
