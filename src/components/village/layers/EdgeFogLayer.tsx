import { WORLD_W, WORLD_H } from "@/lib/village/mapProjection";
import type { BiomeKey } from "@/lib/village/biomes";

interface Props { biome: BiomeKey; }

/** Cintura decorativa + fade sui bordi del mondo: nasconde la fine della mappa.
 *  Senza questo, ai bordi si vedrebbe il vuoto/colore di sfondo. */
export function EdgeFogLayer({ biome }: Props) {
  // Colori cintura per bioma (oggetti naturali che chiudono la scena)
  const palette: Record<BiomeKey, { fog: string; edge: string }> = {
    foresta:     { fog: "rgba(15,40,20,0.85)",   edge: "#1a3322" },
    roccioso:    { fog: "rgba(50,45,40,0.85)",   edge: "#3a3530" },
    litorale:    { fog: "rgba(20,55,80,0.85)",   edge: "#163d5a" },
    montanaro:   { fog: "rgba(180,200,220,0.7)", edge: "#7a8aa0" },
    vulcanico:   { fog: "rgba(60,15,10,0.85)",   edge: "#3a0d08" },
    industriale: { fog: "rgba(35,30,45,0.85)",   edge: "#2a2435" },
    spaziale:    { fog: "rgba(10,8,30,0.9)",     edge: "#0a0820" },
    desertico:   { fog: "rgba(120,80,40,0.7)",   edge: "#7a5028" },
  };
  const p = palette[biome] ?? palette.foresta;

  // Decorazioni di bordo (alberi/rocce/montagne): silhouette stilizzate
  const ring: { x: number; y: number; kind: "tree" | "rock" | "mountain" }[] = [];
  const COUNT = 80;
  for (let i = 0; i < COUNT; i++) {
    const t = i / COUNT;
    const angle = t * Math.PI * 2;
    const margin = 90 + (i % 5) * 18;
    const rx = WORLD_W / 2 - margin;
    const ry = WORLD_H / 2 - margin;
    const x = WORLD_W / 2 + Math.cos(angle) * rx * (0.96 + (i % 7) * 0.005);
    const y = WORLD_H / 2 + Math.sin(angle) * ry * (0.96 + (i % 5) * 0.005);
    const kind = (i % 3 === 0 ? "mountain" : i % 2 === 0 ? "tree" : "rock") as "tree" | "rock" | "mountain";
    ring.push({ x, y, kind });
  }

  return (
    <svg
      width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      className="absolute inset-0 pointer-events-none select-none" aria-hidden
    >
      <defs>
        <radialGradient id="edge-fog" cx="50%" cy="50%" r="55%">
          <stop offset="55%" stopColor="rgba(0,0,0,0)" />
          <stop offset="82%" stopColor={p.fog} />
          <stop offset="100%" stopColor={p.edge} />
        </radialGradient>
      </defs>

      {/* cintura decorazioni */}
      <g opacity={0.85}>
        {ring.map((d, i) => {
          if (d.kind === "tree") {
            return (
              <g key={i}>
                <rect x={d.x - 3} y={d.y - 4} width={6} height={26} fill="#3a2412" />
                <circle cx={d.x} cy={d.y - 14} r={26} fill={biome === "spaziale" ? "#1a2540" : "#2d5a32"} />
                <circle cx={d.x - 8} cy={d.y - 22} r={18} fill={biome === "spaziale" ? "#1a2540" : "#356937"} />
              </g>
            );
          }
          if (d.kind === "mountain") {
            return (
              <path key={i}
                d={`M ${d.x - 38} ${d.y + 18} L ${d.x} ${d.y - 36} L ${d.x + 38} ${d.y + 18} Z`}
                fill={p.edge} stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} />
            );
          }
          return <ellipse key={i} cx={d.x} cy={d.y} rx={18} ry={12} fill="#534840" />;
        })}
      </g>

      {/* fade radiale sopra tutto: dissolve i bordi del mondo */}
      <rect x={0} y={0} width={WORLD_W} height={WORLD_H} fill="url(#edge-fog)" />
    </svg>
  );
}
