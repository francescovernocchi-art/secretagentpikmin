import { AlertTriangle, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { calculateDistanceMeters } from "@/lib/geo/distance";
import { BASE_THREAT_RADIUS_DEFAULT } from "@/lib/map/radiusRules";

export interface NearbyThreat {
  id: string;
  name: string;
  emoji: string;
  distanceM: number;
  dangerLevel: number;
}

interface Props {
  threats: NearbyThreat[];
}

/**
 * Mostra "Minaccia vicina" SOLO se ci sono mostri reali entro il raggio.
 * Altrimenti mostra "Nessuna minaccia rilevata".
 */
export function ThreatAlertPanel({ threats }: Props) {
  const real = threats.filter((t) => t.distanceM <= BASE_THREAT_RADIUS_DEFAULT);

  return (
    <AnimatePresence mode="wait">
      {real.length > 0 ? (
        <motion.div
          key="alert"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="panel-strong p-2.5 border border-rose-500/40 bg-rose-500/10"
        >
          <div className="flex items-center gap-2 mb-1">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </motion.span>
            <p className="text-[11px] uppercase tracking-widest text-rose-300 font-display">
              Minaccia vicina · {real.length}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {real.slice(0, 4).map((t) => (
              <span
                key={t.id}
                className="text-[10px] panel px-1.5 py-0.5 flex items-center gap-1"
                title={`${t.name} · ${Math.round(t.distanceM)}m`}
              >
                <span>{t.emoji}</span>
                <span className="font-display">{Math.round(t.distanceM)}m</span>
                <span className="text-rose-300">⚠{t.dangerLevel}</span>
              </span>
            ))}
            {real.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{real.length - 4} altre</span>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="safe"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="panel p-2 flex items-center gap-2 text-[11px] text-emerald-300/90"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="uppercase tracking-widest">Nessuna minaccia rilevata</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Helper per costruire la lista dalle spawn della mappa. */
export function computeNearbyThreats(
  basePos: { lat: number; lng: number } | null,
  spawns: Array<{ id: string; lat: number; lng: number; enemy: { name: string; emoji: string; danger_level: number } | null }>,
): NearbyThreat[] {
  if (!basePos) return [];
  return spawns
    .map((s) => ({
      id: s.id,
      name: s.enemy?.name ?? "Sconosciuto",
      emoji: s.enemy?.emoji ?? "👾",
      dangerLevel: s.enemy?.danger_level ?? 1,
      distanceM: calculateDistanceMeters(basePos.lat, basePos.lng, s.lat, s.lng),
    }))
    .sort((a, b) => a.distanceM - b.distanceM);
}
