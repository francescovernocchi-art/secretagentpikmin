import { motion } from "framer-motion";
import { useMemo } from "react";
import { FACTIONS, FactionKey } from "@/lib/village/factions";

interface Props {
  faction: FactionKey | null;
  intensity?: number; // 0..1
}

/** Overlay particellare ambient + bagliore della fazione. */
export function VillageAtmosphere({ faction, intensity = 1 }: Props) {
  const cfg = faction ? FACTIONS[faction] : null;
  const count = Math.round(18 * intensity);

  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 6 + Math.random() * 6,
        size: 6 + Math.random() * 10,
      })),
    [count],
  );

  if (!cfg) return null;

  const symbol = particleSymbol(cfg.particles);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* bagliore fazione */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-screen"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${cfg.glow}55, transparent 65%)`,
        }}
      />
      {/* particelle */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute select-none"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            fontSize: p.size,
            color: cfg.glow,
            filter: `drop-shadow(0 0 4px ${cfg.glow})`,
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.9, 0],
            y: cfg.particles === "embers" ? [-10, -80] : [0, 40],
            x: [0, Math.random() > 0.5 ? 20 : -20],
            rotate: cfg.particles === "crystals" ? [0, 360] : 0,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {symbol}
        </motion.span>
      ))}
    </div>
  );
}

function particleSymbol(kind: "leaves" | "sparks" | "embers" | "crystals"): string {
  switch (kind) {
    case "leaves":
      return "🍃";
    case "sparks":
      return "✦";
    case "embers":
      return "•";
    case "crystals":
      return "💎";
  }
}
