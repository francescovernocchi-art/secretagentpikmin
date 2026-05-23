import { motion } from "framer-motion";
import { useMemo } from "react";

interface Props {
  count?: number;
  faction?: string | null;
}

/** Pikmin che vagano nel villaggio. Pure-client, decorativo, mai vuoto. */
export function PikminLife({ count = 6 }: Props) {
  const pikmin = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const colors = ["🔴", "🟡", "🔵", "🟣", "⚪"];
        const activities = ["walk", "carry", "celebrate", "rest"];
        return {
          id: i,
          color: colors[i % colors.length],
          activity: activities[Math.floor(Math.random() * activities.length)],
          startX: 5 + Math.random() * 90,
          startY: 5 + Math.random() * 30,
          duration: 8 + Math.random() * 12,
          delay: Math.random() * 4,
        };
      }),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      {pikmin.map((p) => (
        <motion.div
          key={p.id}
          className="absolute text-base select-none"
          style={{ left: `${p.startX}%`, bottom: `${p.startY}%` }}
          animate={
            p.activity === "rest"
              ? { y: [0, -2, 0], opacity: [0.8, 1, 0.8] }
              : p.activity === "celebrate"
                ? { y: [0, -12, 0], rotate: [0, 15, -15, 0] }
                : {
                    x: [0, 40, 0, -40, 0],
                    y: [0, -6, 0, -6, 0],
                  }
          }
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="drop-shadow-md">
            {p.activity === "carry" ? "📦" : p.color}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
