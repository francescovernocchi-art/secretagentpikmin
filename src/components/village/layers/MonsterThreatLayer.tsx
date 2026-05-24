import { motion } from "framer-motion";
import { WORLD_W, WORLD_H } from "@/lib/village/mapProjection";
import type { NearbyThreat } from "../ThreatAlertPanel";

interface Props { threats: NearbyThreat[]; }

/** Mostra solo minacce reali (entro raggio Campo Base). */
export function MonsterThreatLayer({ threats }: Props) {
  if (!threats.length) return null;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {threats.slice(0, 6).map((t, i) => {
        // posizionali ai bordi mondo come "fuori dalla cinta"
        const angle = (i / Math.max(1, threats.length)) * Math.PI * 2;
        const r = Math.min(WORLD_W, WORLD_H) * 0.42;
        const x = WORLD_W / 2 + Math.cos(angle) * r;
        const y = WORLD_H / 2 + Math.sin(angle) * r;
        return (
          <motion.div
            key={t.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: x, top: y }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            <span className="text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,.6)]">
              {t.enemy?.emoji ?? "👾"}
            </span>
            <span className="mt-0.5 text-[9px] px-1.5 rounded bg-red-700/80 text-white whitespace-nowrap">
              {t.enemy?.name ?? "Minaccia"} · {Math.round(t.distance_m)}m
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
