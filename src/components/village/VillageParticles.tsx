import { motion } from "framer-motion";
import { useMemo } from "react";
import type { FactionKey } from "@/lib/village/factions";

interface Props {
  faction: FactionKey;
  density?: number;
}

const PARTICLE: Record<FactionKey, { emoji: string; color: string }> = {
  eco: { emoji: "🍃", color: "#7be07b" },
  tech: { emoji: "✦", color: "#7dd3fc" },
  battle: { emoji: "•", color: "#fb923c" },
  mystic: { emoji: "✧", color: "#c084fc" },
};

export function VillageParticles({ faction, density = 12 }: Props) {
  const p = PARTICLE[faction] ?? PARTICLE.eco;
  const items = useMemo(
    () =>
      Array.from({ length: density }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 6 + Math.random() * 6,
        size: 8 + Math.random() * 8,
        sway: 10 + Math.random() * 20,
      })),
    [density, faction],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((it) => (
        <motion.span
          key={it.id}
          className="absolute"
          style={{
            left: `${it.x}%`,
            top: "-10%",
            fontSize: it.size,
            color: p.color,
            textShadow: `0 0 8px ${p.color}`,
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: "120vh",
            x: [0, it.sway, -it.sway, 0],
            opacity: [0, 1, 1, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: it.duration,
            delay: it.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}
